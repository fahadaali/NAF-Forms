import { NextResponse } from "next/server";
import { getFormBySlug, saveDraft, getDraft } from "@/lib/repo";
import { parseSettings } from "@/lib/utils";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// حفظ ومتابعة لاحقًا: تخزين إجابات جزئية واستعادتها برابط استئناف.
// POST = حفظ (يُعيد رمز الاستئناف) · GET ?token= = استعادة
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`draft:${clientIp(req)}`, 20, 60_000))
    return NextResponse.json(
      { error: "محاولات كثيرة، حاول لاحقًا" },
      { status: 429 }
    );

  const form = await getFormBySlug((await params).slug);
  if (!form)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });
  if (form.status !== "PUBLISHED")
    return NextResponse.json({ error: "النموذج لم يُنشر بعد" }, { status: 403 });

  const settings = parseSettings(form.settings);
  if (!settings.behavior?.allowSaveResume)
    return NextResponse.json({ error: "الحفظ غير مفعّل" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const token = await saveDraft(
    form.id,
    JSON.stringify(body.answers ?? {}),
    String(body.email || ""),
    body.token ? String(body.token) : undefined
  );
  return NextResponse.json({ ok: true, token });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token)
    return NextResponse.json({ error: "رمز مفقود" }, { status: 400 });

  const form = await getFormBySlug((await params).slug);
  if (!form)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });

  const draft = await getDraft(form.id, token);
  if (!draft)
    return NextResponse.json({ error: "المسودّة غير موجودة" }, { status: 404 });

  let answers: Record<string, any> = {};
  try {
    answers = JSON.parse(draft.answers);
  } catch {
    answers = {};
  }
  return NextResponse.json({ ok: true, answers, email: draft.email });
}
