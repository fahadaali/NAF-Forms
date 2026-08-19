import { NextResponse } from "next/server";
import { getFormWithResponses, getReviewsByForm } from "@/lib/repo";
import {
  parseSettings,
  safeParse,
  isInputQuestion,
  answerToText,
} from "@/lib/utils";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { timingSafeEqualAsync } from "@/lib/compare";
import { isOwnerActive } from "@/lib/members";

export const runtime = "nodejs";

/* واجهة برمجية للقراءة فقط: تسحب ردود نموذج بصيغة JSON.
   المصادقة برمز خاص بالنموذج: Authorization: Bearer <token>
   (يُولَّد من تبويب التخصيص → التكاملات، ولا يُرسل أبداً لصفحة التعبئة.)

   **المسار عامّ في `PUBLIC_PREFIXES`، وحراستُه الرمز لا الجلسة.** المنادي
   خادمٌ خارجي لا متصفّح، فحارس الدخول الموحّد كان يردّه ٤٠١ قبل أن يصل
   هنا — أي أن الميزة كانت معطّلة بينما تبويب التكاملات يعرضها كاملة
   بمثال `curl` جاهز. وذلك أسوأ من غيابها.

   وثلاثة شروط تجعل فتحه غير فتحِ باب ثانٍ:

   ١) **مقفل افتراضاً لكل نموذج.** `apiEnabled` يرفعه صاحبه صراحةً، والرمز
      يُولَّد عندها ويُدوَّر متى شاء.

   ٢) **قراءة نموذج واحد.** الرمز لا يفتح غير النموذج الذي وُلِّد له.

   ٣) **يتبع سحب الوصول.** كل طلب يفحص أن مالك النموذج ما زال عضواً نشطاً
      في `members` — فمن سُحب وصولُه مركزياً يتوقّف مفتاحه معه، وهو
      الاعتراض الذي كان الإغلاقُ يعالجه.

   والمقارنة صارت ثابتة الزمن حقاً: كانت تفرّق بالطول أولاً وتخرج عنده،
   فتُقاس بها بادئةُ الرمز. و`timingSafeEqualAsync` تقارن بصمتين ثابتتَي
   الطول فلا تكشف طولاً ولا موضعَ اختلاف. */
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
  if (!(await timingSafeEqualAsync(provided, token)))
    return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });

  // الرمز يتبع وصول مالكه: من سُحب وصولُه مركزياً لا تُقرأ ردودُه بمفتاحه.
  if (!(await isOwnerActive(form.ownerId)))
    return NextResponse.json(
      { error: "الواجهة البرمجية غير مفعّلة لهذا النموذج" },
      { status: 403 }
    );

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
