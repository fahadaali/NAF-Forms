// حالات مراجعة الردود (تتبّع المتقدمين للتقديم الوظيفي، وتصنيف الردود عمومًا)
export const REVIEW_STATUSES = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  SCREENING: "فرز",
  INTERVIEW: "مقابلة",
  OFFER: "عرض",
  HIRED: "مقبول",
  REJECTED: "مرفوض",
};

// أصناف الألوان لكل حالة (تُستخدم مع chip).
// `‎-soft` للخلفية و`‎-strong` للنصّ — القاعدة ٦: اللون الأساس على سطحه
// الناعم دون AA بحجم الوسم، والتخفيف بـ`‎/15` قيمةٌ منتقاة باليد.
export const REVIEW_STATUS_CHIP: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground",
  SCREENING: "bg-info-soft text-info-strong",
  INTERVIEW: "bg-warning-soft text-warning-strong",
  OFFER: "bg-chart-4-soft text-chart-4-strong",
  HIRED: "bg-success-soft text-success-strong",
  REJECTED: "bg-destructive-soft text-destructive-strong",
};

export function isReviewStatus(v: unknown): v is ReviewStatus {
  return REVIEW_STATUSES.includes(v as ReviewStatus);
}
