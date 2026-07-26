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
  NEW: "bg-muted text-muted-foreground",
  SCREENING: "bg-info/15 text-info",
  INTERVIEW: "bg-warning/15 text-warning",
  OFFER: "bg-chart-4/15 text-chart-4",
  HIRED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/15 text-destructive",
};

export function isReviewStatus(v: unknown): v is ReviewStatus {
  return REVIEW_STATUSES.includes(v as ReviewStatus);
}
