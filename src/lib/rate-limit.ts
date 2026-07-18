// محدِّد معدّل بسيط في الذاكرة (لكل عملية/خادم). كافٍ للحماية الأساسية من السبام.
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max = 8,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  // تنظيف دوري بسيط
  if (hits.size > 5000) hits.clear();
  return arr.length <= max;
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
