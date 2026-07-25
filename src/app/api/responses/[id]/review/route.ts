import { NextResponse } from "next/server";
import { getResponseWithAnswers, upsertReview } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { isReviewStatus } from "@/lib/review";

// تحديث مراجعة رد: الحالة، التقييم، الملاحظات الداخلية
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const response = await getResponseWithAnswers(id);
  if (!response)
    return NextResponse.json({ error: "الرد غير موجود" }, { status: 404 });
  if (!(await authorizeForm(response.formId)))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data: { status?: string; rating?: number; notes?: string } = {};

  if (body.status !== undefined) {
    if (!isReviewStatus(body.status))
      return NextResponse.json({ error: "حالة غير معروفة" }, { status: 400 });
    data.status = body.status;
  }
  if (body.rating !== undefined) {
    const n = Number(body.rating);
    if (!Number.isFinite(n) || n < 0 || n > 5)
      return NextResponse.json(
        { error: "التقييم يجب أن يكون بين 0 و5" },
        { status: 400 }
      );
    data.rating = Math.round(n);
  }
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 5000);

  const review = await upsertReview(id, data);
  return NextResponse.json({ ok: true, review });
}
