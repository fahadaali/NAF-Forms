import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  safeParse,
  gradeAnswer,
  parseSettings,
  isVisibleByLogic,
} from "@/lib/utils";
import { sendMail } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// استلام رد على النموذج (عام) مع تسجيل تاريخ ووقت التقديم وحساب درجة الاختبار
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const body = await req.json();
  const answers: Record<string, any> = body.answers || {};

  // مصيدة السبام (honeypot): حقل مخفي يجب أن يبقى فارغًا
  if (body.hp) return NextResponse.json({ ok: true });

  // تحديد معدّل الإرسال لكل عنوان IP
  if (!rateLimit(`submit:${clientIp(req)}`))
    return NextResponse.json(
      { error: "محاولات كثيرة، حاول لاحقًا" },
      { status: 429 }
    );

  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    include: { questions: true },
  });
  if (!form)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });
  if (form.status === "CLOSED")
    return NextResponse.json({ error: "النموذج مغلق" }, { status: 403 });

  const settings = parseSettings(form.settings);

  // الإغلاق التلقائي بحسب التاريخ أو حد الردود
  const closeAt = settings.limits?.closeAt;
  if (closeAt && new Date(closeAt).getTime() < Date.now())
    return NextResponse.json(
      { error: "انتهى وقت استقبال الردود" },
      { status: 403 }
    );
  const maxResponses = settings.limits?.maxResponses;
  if (maxResponses && maxResponses > 0) {
    const count = await prisma.response.count({ where: { formId: form.id } });
    if (count >= maxResponses)
      return NextResponse.json(
        { error: "اكتمل العدد الأقصى للردود" },
        { status: 403 }
      );
  }

  // التحقق من كلمة المرور إن وُجدت
  const password = settings.access?.password || "";
  if (password && String(body.password || "") !== password)
    return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 403 });

  // التحقق من بريد المستفيد إن كان مطلوبًا
  const email = String(body.email || "").trim();
  if (settings.behavior?.collectEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json(
        { error: "البريد الإلكتروني مطلوب" },
        { status: 400 }
      );
  }

  // منع تكرار التقديم بنفس البريد
  if (settings.access?.oneResponsePerEmail && email) {
    const prior = await prisma.response.findMany({
      where: { formId: form.id },
      select: { meta: true },
    });
    const already = prior.some(
      (r) => safeParse<any>(r.meta, {}).email === email
    );
    if (already)
      return NextResponse.json(
        { error: "سبق أن قدّمت ردًا بهذا البريد" },
        { status: 409 }
      );
  }

  // التحقق من الأسئلة الإلزامية (مع تجاهل المخفية بالمنطق الشرطي)
  for (const q of form.questions) {
    const cfg = safeParse<Record<string, any>>(q.config, {});
    if (q.required && isVisibleByLogic(cfg, answers)) {
      const v = answers[q.id];
      const empty =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty)
        return NextResponse.json(
          { error: `السؤال «${q.label}» إلزامي` },
          { status: 400 }
        );
    }
  }

  // حساب الدرجة للاختبارات
  let score = 0;
  let total = 0;
  if (form.type === "EXAM") {
    for (const q of form.questions) {
      const cfg = safeParse<Record<string, any>>(q.config, {});
      if (cfg.correctAnswer !== undefined && cfg.correctAnswer !== "") {
        total += Number(cfg.points ?? 1);
        const { points } = gradeAnswer(q.type, cfg, answers[q.id]);
        score += points;
      }
    }
  }

  const meta = {
    userAgent: req.headers.get("user-agent") || "",
    email: email || undefined,
    score: form.type === "EXAM" ? score : undefined,
    total: form.type === "EXAM" ? total : undefined,
  };

  const response = await prisma.response.create({
    data: {
      formId: form.id,
      meta: JSON.stringify(meta),
      answers: {
        create: form.questions
          .filter((q) => answers[q.id] !== undefined)
          .map((q) => ({
            questionId: q.id,
            value: JSON.stringify(answers[q.id]),
          })),
      },
    },
  });

  // إشعار بريد للمشرف عند وصول رد جديد (غير حاجب — لا يؤخّر الاستجابة)
  const notifyTo = settings.notify?.email;
  if (notifyTo) {
    const respCount = await prisma.response.count({
      where: { formId: form.id },
    });
    void sendMail({
      to: notifyTo,
      subject: `رد جديد على «${form.title}»`,
      html: `
        <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">
          <h2>وصل رد جديد على النموذج «${form.title}»</h2>
          <p>وقت التقديم: ${new Date().toLocaleString("ar-SA")}</p>
          ${email ? `<p>بريد المستفيد: ${email}</p>` : ""}
          <p>إجمالي الردود الآن: ${respCount}</p>
        </div>`,
    }).catch(() => {});
  }

  // رسالة تأكيد للمستفيد
  if (settings.notify?.confirmToRespondent && email) {
    void sendMail({
      to: email,
      subject: settings.notify.confirmSubject || `تأكيد استلام ردك — ${form.title}`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">
        <p>${settings.notify.confirmMessage || "شكرًا لك، تم استلام ردك بنجاح."}</p>
      </div>`,
    }).catch(() => {});
  }

  // Webhook: إرسال بيانات الرد إلى نظام خارجي
  if (settings.notify?.webhookUrl) {
    void fetch(settings.notify.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: form.id,
        formTitle: form.title,
        responseId: response.id,
        submittedAt: response.submittedAt,
        email: email || null,
        score: meta.score,
        total: meta.total,
        answers,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    responseId: response.id,
    score: meta.score,
    total: meta.total,
  });
}
