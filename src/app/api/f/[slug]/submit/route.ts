import { NextResponse } from "next/server";
import {
  getFormBySlug,
  countResponses,
  getResponsesMeta,
  createResponse,
  getOptionCounts,
  completeVisit,
  deleteDraft,
  countAttemptsByEmail,
} from "@/lib/repo";
import {
  safeParse,
  gradeAnswer,
  parseSettings,
  isInputQuestion,
  validateAnswer,
  computeVisibleQuestions,
  sanitizeFileAnswer,
} from "@/lib/utils";
import { publicUploadBase } from "@/lib/storage";
import { timingSafeEqual } from "@/lib/compare";
import { getVisitStartedAt } from "@/lib/repo";
import { escapeHtml, sendMail } from "@/lib/mailer";
import { deliverAndLog } from "@/lib/deliver";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { formatDate, formatTime } from "@/lib/naf-format";

// استلام رد على النموذج (عام) مع تسجيل تاريخ ووقت التقديم وحساب درجة الاختبار
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
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

  const form = await getFormBySlug((await params).slug);
  if (!form)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });
  if (form.status === "CLOSED")
    return NextResponse.json({ error: "النموذج مغلق" }, { status: 403 });
  // لا تُستقبل الردود إلا بعد النشر (المسودة للمعاينة فقط)
  if (form.status !== "PUBLISHED")
    return NextResponse.json(
      { error: "النموذج لم يُنشر بعد — لا يمكن استقبال الردود" },
      { status: 403 }
    );

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
    const count = await countResponses(form.id);
    if (count >= maxResponses)
      return NextResponse.json(
        { error: "اكتمل العدد الأقصى للردود" },
        { status: 403 }
      );
  }

  // التحقق من كلمة المرور إن وُجدت
  const password = settings.access?.password || "";
  if (password && !timingSafeEqual(String(body.password || ""), password))
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
    const prior = await getResponsesMeta(form.id);
    const already = prior.some(
      (r) => safeParse<any>(r.meta, {}).email === email
    );
    if (already)
      return NextResponse.json(
        { error: "سبق أن قدّمت ردًا بهذا البريد" },
        { status: 409 }
      );
  }

  // سياسة إعادة المحاولة للاختبارات: أقصى عدد محاولات للبريد نفسه
  const maxAttempts = Number(settings.exam?.maxAttempts ?? 0);
  if (form.type === "EXAM" && maxAttempts > 0 && email) {
    const used = await countAttemptsByEmail(form.id, email);
    if (used >= maxAttempts)
      return NextResponse.json(
        {
          error: `استنفدت عدد المحاولات المسموح (${maxAttempts})`,
        },
        { status: 409 }
      );
  }

  /* ═══ مؤقّت الاختبار يُقاس على الخادم ═══

     كان العدّ في المتصفّح وحده يسلّم تلقائيًا عند الصفر، ولا شيء في الخادم
     يقيس زمنًا. فمن أغلق الجافاسكربت أو أرسل الطلب مباشرةً يسلّم بعد
     انتهاء الوقت بلا مانع.

     والمرجع بداية الزيارة المسجَّلة في `Visit` — لا وقتٌ يرسله العميل،
     فذلك يُزوَّر. وبلا زيارة مسجَّلة لا يُقاس شيء ولا يُردّ التقديم:
     الزيارة قد تفشل لأسباب مشروعة (حاجب، شبكة)، ورفضُ ردٍّ صحيح أسوأ من
     قبول ردٍّ متأخّر. ويُسمح بهامش دقيقة لبطء الشبكة وفارق الساعات.
     */
  const limitMin = Number(settings.exam?.timeLimitMin ?? 0);
  if (form.type === "EXAM" && limitMin > 0 && body.visitId) {
    const startedAt = await getVisitStartedAt(form.id, String(body.visitId));
    if (startedAt) {
      const elapsed = (Date.now() - startedAt.getTime()) / 1000;
      if (elapsed > limitMin * 60 + 60)
        return NextResponse.json(
          { error: "انتهى وقت الاختبار" },
          { status: 403 }
        );
    }
  }

  // التحقق من الأسئلة (إلزامية + صحة الصيغة) مع تجاهل المخفية بالمنطق الشرطي
  // أو المخفية ضمن قسم غير ظاهر، وتجاهل عناصر العرض (نص/صورة/فيديو)
  const visibleIds = new Set(
    computeVisibleQuestions(form.questions, answers).map((q) => q.id)
  );

  // بنك الأسئلة: عند تفعيل الاختيار العشوائي لا يرى المستفيد كل الأسئلة، فنقصر
  // التحقق والتصحيح على ما عُرض عليه فعلًا (askedIds)، مع التأكد من أن عددها
  // مطابق للمطلوب حتى لا يُتجاوز التحقق بإرسال قائمة مبتورة.
  const wantCount = Number(settings.exam?.questionCount ?? 0);
  const totalInputs = form.questions.filter((q) => isInputQuestion(q.type)).length;
  let askedIds: Set<string> | null = null;
  if (form.type === "EXAM" && wantCount > 0 && wantCount < totalInputs) {
    const sent: string[] = Array.isArray(body.askedIds)
      ? body.askedIds.map((v: unknown) => String(v))
      : [];
    /* التكرار يُزال **قبل** قياس الطول.
       كان الفحص على طول القائمة والاستعمال على مجموعةٍ منها، فإرسال
       `["q1","q1","q1","q1","q1"]` مع `questionCount: 5` يمرّ الفحص ثم
       يصير `askedIds` عنصرًا واحدًا: التحقق والتصحيح على سؤال واحد،
       و`total` درجتُه وحدها — أي مئة بالمئة بإجابة واحدة. */
    const valid = [...new Set(sent)].filter((id) =>
      form.questions.some((q) => q.id === id && isInputQuestion(q.type))
    );
    if (valid.length < Math.min(wantCount, totalInputs))
      return NextResponse.json(
        { error: "قائمة الأسئلة غير مكتملة" },
        { status: 400 }
      );
    askedIds = new Set(valid);
  }

  // مرفقات الإجابة تُنقّى قبل أي شيء: ما لا يشير إلى تخزيننا يسقط، فلا
  // يصل لوحة الردود رابطٌ خارجي بهيئة «السيرة الذاتية».
  const uploadBase = publicUploadBase();
  for (const q of form.questions) {
    if (q.type !== "FILE") continue;
    if (answers[q.id] !== undefined)
      answers[q.id] = sanitizeFileAnswer(answers[q.id], uploadBase);
  }

  for (const q of form.questions) {
    if (!isInputQuestion(q.type)) continue;
    if (!visibleIds.has(q.id)) continue;
    if (askedIds && !askedIds.has(q.id)) continue;
    const cfg = safeParse<Record<string, any>>(q.config, {});
    const err = validateAnswer(q.type, cfg, answers[q.id], q.required);
    if (err)
      return NextResponse.json(
        { error: `«${q.label}»: ${err}` },
        { status: 400 }
      );
  }

  // التحقق من حصص الخيارات (مثل عدد المقاعد لكل موعد)
  const quotaByQ: Record<string, Record<string, number>> = {};
  for (const q of form.questions) {
    if (!visibleIds.has(q.id)) continue;
    const cfg = safeParse<Record<string, any>>(q.config, {});
    if (cfg.quotas && Object.keys(cfg.quotas).length) quotaByQ[q.id] = cfg.quotas;
  }
  const quotaQIds = Object.keys(quotaByQ);
  if (quotaQIds.length) {
    const counts = await getOptionCounts(form.id, quotaQIds);
    for (const qid of quotaQIds) {
      const picked = answers[qid];
      const chosen = (Array.isArray(picked) ? picked : [picked])
        .map((v) => String(v ?? ""))
        .filter(Boolean);
      for (const option of chosen) {
        const max = Number(quotaByQ[qid][option]);
        if (!Number.isFinite(max) || max <= 0) continue;
        if ((counts[qid]?.[option] || 0) >= max)
          return NextResponse.json(
            { error: `اكتمل العدد المتاح للخيار «${option}»` },
            { status: 409 }
          );
      }
    }
  }

  // حساب الدرجة للاختبارات + بناء مراجعة الإجابات
  let score = 0;
  let total = 0;
  const review: any[] = [];
  if (form.type === "EXAM") {
    for (const q of form.questions) {
      if (!visibleIds.has(q.id)) continue;
      if (askedIds && !askedIds.has(q.id)) continue;
      const cfg = safeParse<Record<string, any>>(q.config, {});
      if (cfg.correctAnswer !== undefined && cfg.correctAnswer !== "") {
        total += Number(cfg.points ?? 1);
        const graded = gradeAnswer(q.type, cfg, answers[q.id]);
        score += graded.points;
        if (settings.exam?.showAnswers)
          review.push({
            label: q.label,
            correct: graded.correct,
            your: answers[q.id] ?? "",
            correctAnswer: cfg.correctAnswer,
          });
      }
    }
  }
  const passScore = settings.exam?.passScore;
  const passed =
    form.type === "EXAM" && passScore != null ? score >= passScore : undefined;

  const meta = {
    userAgent: req.headers.get("user-agent") || "",
    email: email || undefined,
    score: form.type === "EXAM" ? score : undefined,
    total: form.type === "EXAM" ? total : undefined,
  };

  const response = await createResponse(
    form.id,
    JSON.stringify(meta),
    form.questions
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => ({
        questionId: q.id,
        value: JSON.stringify(answers[q.id]),
      }))
  );

  // ختم زيارة التعبئة (لحساب معدّل الإكمال والزمن) وحذف المسودّة إن وُجدت
  if (body.visitId)
    await completeVisit(form.id, String(body.visitId), response.id).catch(() => {});
  if (body.draftToken) await deleteDraft(form.id, String(body.draftToken)).catch(() => {});

  // إشعار بريد للمشرف عند وصول رد جديد (غير حاجب — لا يؤخّر الاستجابة)
  const notifyTo = settings.notify?.email;
  if (notifyTo) {
    const respCount = await countResponses(form.id);
    void sendMail({
      to: notifyTo,
      subject: `رد جديد على «${form.title}»`,
      // قالب بريد: القيم الحرفية هنا استثناءُ القاعدة ١ الأول — عملاء
      // البريد لا يقرأون متغيّرات CSS. والقيم مهرَّبة: العنوان والبريد
      // يكتبهما مستخدمون.
      html: `
        <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">
          <h2>وصل رد جديد على النموذج «${escapeHtml(form.title)}»</h2>
          <p>وقت التقديم: ${formatDate(new Date())} ${formatTime(new Date())}</p>
          ${email ? `<p>بريد المستفيد: ${escapeHtml(email)}</p>` : ""}
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
        <p>${escapeHtml(settings.notify.confirmMessage || "تم استلام ردك.")}</p>
      </div>`,
    }).catch(() => {});
  }

  // التسليم إلى الوجهات الخارجية مع إعادة المحاولة وتسجيل النتيجة.
  // نبني حمولة مقروءة (بأسماء الأسئلة) إلى جانب الإجابات الخام.
  const labelled: Record<string, any> = {};
  for (const q of form.questions) {
    if (!isInputQuestion(q.type)) continue;
    if (answers[q.id] === undefined) continue;
    labelled[q.label || q.id] = answers[q.id];
  }
  const payload = {
    formId: form.id,
    formSlug: form.slug,
    formTitle: form.title,
    responseId: response.id,
    submittedAt: response.submittedAt,
    email: email || null,
    score: meta.score,
    total: meta.total,
    answers,
    fields: labelled,
  };

  const targets: { kind: "webhook" | "sheets"; url: string }[] = [];
  if (settings.notify?.webhookUrl)
    targets.push({ kind: "webhook", url: settings.notify.webhookUrl });
  if (settings.integrations?.sheetsUrl)
    targets.push({ kind: "sheets", url: settings.integrations.sheetsUrl });

  // ننفّذها بالتوازي وننتظرها حتى تُسجَّل النتيجة قبل انتهاء الطلب على Workers
  if (targets.length)
    await Promise.all(
      targets.map((t) =>
        deliverAndLog({
          formId: form.id,
          responseId: response.id,
          kind: t.kind,
          url: t.url,
          payload,
        }).catch(() => null)
      )
    );

  return NextResponse.json({
    ok: true,
    responseId: response.id,
    score: meta.score,
    total: meta.total,
    passed,
    review: settings.exam?.showAnswers ? review : undefined,
  });
}
