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

// أصناف الألوان لكل حالة (تُستخدم مع chip)
export const REVIEW_STATUS_CHIP: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600",
  SCREENING: "bg-sky-100 text-sky-700",
  INTERVIEW: "bg-amber-100 text-amber-800",
  OFFER: "bg-violet-100 text-violet-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export function isReviewStatus(v: unknown): v is ReviewStatus {
  return REVIEW_STATUSES.includes(v as ReviewStatus);
}
