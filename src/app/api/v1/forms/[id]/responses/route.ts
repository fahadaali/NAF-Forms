import { NextResponse } from "next/server";
import { getFormWithResponses, getReviewsByForm } from "@/lib/repo";
import {
  parseSettings,
  safeParse,
  isInputQuestion,
  answerToText,
} from "@/lib/utils";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// واجهة برمجية للقراءة فقط: تسحب ردود نموذج بصيغة JSON.
// المصادقة برمز خاص بالنموذج: Authorization: Bearer <token>
// (يُولَّد من تبويب التخصيص → التكاملات، ولا يُرسل أبدًا لصفحة التعبئة.)
//
// **وهذا المسار خلف حارس الدخول الموحّد، فالمفتاح الآلي لا يفتحه.**
// المسار خارج قائمة المسارات العامة في `src/lib/sso.ts`، فالوسيط يردّ
// عليه ٤٠١ قبل أن يصل هذا الملف — أي أن التكامل الخارجي معطَّل فعلياً منذ
// الربط. وهو مقصود لا سهو: مفتاحٌ يفتح بيانات بلا مرور بالمركز طريقُ
// دخولٍ ثانٍ، ومن سُحب وصولُه مركزياً يبقى مفتاحه عاملاً.
//
// وفتحه ثانيةً قرارُ منتج لا قرارُ ربط: يستلزم إعلانه مساراً عاماً
// صراحةً، ومقارنةً ثابتة الزمن للرمز (المقارنة أدناه تقصر عن ذلك: تقرأ
// `token.charCodeAt(i)` خارج حدوده حين يقصر المُرسَل، وتفرّق بالطول
// أولاً). مرفوعٌ في تقرير الجلسة ولم يُغيَّر هنا.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(`api:${clientIp(req)}`, 60, 60_000))
    return NextResponse.json(
      { error: "طلبات كثيرة، حاول لاحقًا" },
      { status: 429 }
    );

  const formId = (await params).id;
  const form = await getFormWithResponses(formId);
  if (!form)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });

  const settings = parseSettings(form.settings);
  const token = settings.integrations?.apiToken || "";
  if (!settings.integrations?.apiEnabled || !token)
    return NextResponse.json(
      { error: "الواجهة البرمجية غير مفعّلة لهذا النموذج" },
      { status: 403 }
    );

  const auth = req.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  // مقارنة ثابتة الزمن
  const same =
    provided.length === token.length &&
    provided.split("").reduce((acc, ch, i) => acc | (ch.charCodeAt(0) ^ token.charCodeAt(i)), 0) === 0;
  if (!same)
    return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500);
  const since = searchParams.get("since");
  const sinceTs = since ? new Date(since).getTime() : null;

  const reviews = await getReviewsByForm(formId);
  const questions = form.questions.filter((q) => isInputQuestion(q.type));

  const responses = form.responses
    .filter((r) => (sinceTs ? r.submittedAt.getTime() > sinceTs : true))
    .slice(0, limit)
    .map((r) => {
      const byQ: Record<string, any> = {};
      for (const a of r.answers) byQ[a.questionId] = safeParse(a.value, "");
      const meta = safeParse<any>(r.meta, {});
      const rev = reviews[r.id];
      return {
        id: r.id,
        submittedAt: r.submittedAt.toISOString(),
        email: meta.email || null,
        score: meta.score ?? null,
        total: meta.total ?? null,
        review: {
          status: rev?.status || "NEW",
          rating: rev?.rating || 0,
          notes: rev?.notes || "",
        },
        answers: questions.map((q) => ({
          questionId: q.id,
          label: q.label,
          type: q.type,
          value: byQ[q.id] ?? null,
          text: answerToText(
            q.type,
            byQ[q.id],
            safeParse<Record<string, any>>(q.config, {})
          ),
        })),
      };
    });

  return NextResponse.json({
    ok: true,
    form: { id: form.id, slug: form.slug, title: form.title, type: form.type },
    count: responses.length,
    responses,
  });
}
