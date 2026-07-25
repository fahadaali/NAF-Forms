import { NextResponse } from "next/server";
import { listDeliveries, getFormWithResponses } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { deliverAndLog } from "@/lib/deliver";
import { parseSettings, safeParse, isInputQuestion } from "@/lib/utils";

// GET  = سجل التسليم لهذا النموذج
// POST = إعادة إرسال آخر رد إلى الوجهات المضبوطة (اختبار/إعادة محاولة يدوية)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const formId = (await params).id;
  if (!(await authorizeForm(formId)))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const deliveries = await listDeliveries(formId, 50);
  return NextResponse.json({ ok: true, deliveries });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const formId = (await params).id;
  const auth = await authorizeForm(formId);
  if (!auth)
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const settings = parseSettings(auth.form.settings);
  const targets: { kind: "webhook" | "sheets"; url: string }[] = [];
  if (settings.notify?.webhookUrl)
    targets.push({ kind: "webhook", url: settings.notify.webhookUrl });
  if (settings.integrations?.sheetsUrl)
    targets.push({ kind: "sheets", url: settings.integrations.sheetsUrl });
  if (!targets.length)
    return NextResponse.json(
      { error: "لا توجد وجهة مضبوطة (Webhook أو Google Sheets)" },
      { status: 400 }
    );

  // أحدث رد (أو حمولة تجريبية إن لم توجد ردود)
  const full = await getFormWithResponses(formId);
  const latest = full?.responses[0];
  let payload: Record<string, any>;
  if (latest) {
    const byQ: Record<string, any> = {};
    for (const a of latest.answers) byQ[a.questionId] = safeParse(a.value, "");
    const labelled: Record<string, any> = {};
    for (const q of full!.questions) {
      if (!isInputQuestion(q.type)) continue;
      if (byQ[q.id] === undefined) continue;
      labelled[q.label || q.id] = byQ[q.id];
    }
    const meta = safeParse<any>(latest.meta, {});
    payload = {
      formId,
      formSlug: auth.form.slug,
      formTitle: auth.form.title,
      responseId: latest.id,
      submittedAt: latest.submittedAt,
      email: meta.email || null,
      score: meta.score,
      total: meta.total,
      answers: byQ,
      fields: labelled,
      resent: true,
    };
  } else {
    payload = {
      formId,
      formSlug: auth.form.slug,
      formTitle: auth.form.title,
      test: true,
      message: "حمولة اختبار من منصة ناف",
    };
  }

  const results = await Promise.all(
    targets.map(async (t) => ({
      kind: t.kind,
      ...(await deliverAndLog({
        formId,
        responseId: latest?.id || "",
        kind: t.kind,
        url: t.url,
        payload,
      })),
    }))
  );
  return NextResponse.json({ ok: true, results });
}
