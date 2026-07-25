import { NextResponse } from "next/server";
import { getFormBySlug, getOptionCounts } from "@/lib/repo";
import { safeParse } from "@/lib/utils";

// المتبقي من حصص الخيارات: { questionId: { option: remaining } }
// يُستخدم في صفحة التعبئة لتعطيل الخيارات المكتملة.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const form = await getFormBySlug((await params).slug);
  if (!form)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });

  // الأسئلة التي عُرّفت لها حصص
  const quotaByQ: Record<string, Record<string, number>> = {};
  for (const q of form.questions) {
    const cfg = safeParse<Record<string, any>>(q.config, {});
    const quotas = cfg.quotas;
    if (quotas && typeof quotas === "object" && Object.keys(quotas).length)
      quotaByQ[q.id] = quotas;
  }
  const ids = Object.keys(quotaByQ);
  if (!ids.length) return NextResponse.json({ remaining: {} });

  const counts = await getOptionCounts(form.id, ids);
  const remaining: Record<string, Record<string, number>> = {};
  for (const qid of ids) {
    remaining[qid] = {};
    for (const [option, limit] of Object.entries(quotaByQ[qid])) {
      const max = Number(limit);
      if (!Number.isFinite(max) || max <= 0) continue; // 0 أو فارغ = بلا حصة
      remaining[qid][option] = Math.max(0, max - (counts[qid]?.[option] || 0));
    }
  }
  return NextResponse.json({ remaining });
}
