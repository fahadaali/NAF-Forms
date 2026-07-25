import { NextResponse } from "next/server";
import { getFormBySlug, startVisit, touchVisit } from "@/lib/repo";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// تتبّع محاولات التعبئة (لحساب معدّل الإكمال ونقاط التسرّب وزمن التعبئة).
// POST  = بدء زيارة جديدة → يُعيد visitId
// PATCH = تحديث آخر سؤال وُصل إليه
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`visit:${clientIp(req)}`, 30, 60_000))
    return NextResponse.json({ ok: false }, { status: 429 });

  const form = await getFormBySlug((await params).slug);
  // لا نتتبّع إلا النماذج المنشورة (المسودة معاينة فقط)
  if (!form || form.status !== "PUBLISHED")
    return NextResponse.json({ ok: false });

  const visitId = await startVisit(form.id);
  return NextResponse.json({ ok: true, visitId });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`visitp:${clientIp(req)}`, 200, 60_000))
    return NextResponse.json({ ok: false }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const visitId = String(body.visitId || "");
  const questionId = String(body.questionId || "");
  if (!visitId) return NextResponse.json({ ok: false }, { status: 400 });

  const form = await getFormBySlug((await params).slug);
  if (!form) return NextResponse.json({ ok: false }, { status: 404 });

  await touchVisit(visitId, questionId);
  return NextResponse.json({ ok: true });
}
