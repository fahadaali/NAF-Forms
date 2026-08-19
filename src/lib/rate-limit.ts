// محدِّد معدّل بسيط في الذاكرة (لكل معزولة/خادم). كافٍ للحماية الأساسية من السبام.
//
// حدّه المعروف: على Workers لكل معزولة نافذتها، فالحدّ الفعلي أعلى من
// المكتوب. يُقبل لأن الغرض إبطاء الإساءة لا منعها منعًا قاطعًا — ومنعُها
// القاطع يحتاج عدّادًا مشتركًا (D1 أو Durable Object) وهو قرار منفصل.
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

  /* التنظيف يُسقط المنتهي لا الجميع.
     كان `hits.clear()` عند تجاوز خمسة آلاف مفتاح — أي أن من يريد إسقاط
     الحدّ يملأ الخريطة بمفاتيح مصطنعة ثم يمرّ. والآن تُحذف المفاتيح التي
     خلت نافذتها وحدها، فالإغراق يزيد العمل ولا يفتح الباب. */
  if (hits.size > 5000)
    for (const [k, times] of hits)
      if (!times.some((t) => now - t < windowMs)) hits.delete(k);

  return arr.length <= max;
}

/**
 * عنوان العميل.
 *
 * **`CF-Connecting-IP` أولًا لا `X-Forwarded-For`.** كلاودفلير **تُلحق**
 * العنوان الحقيقي بـ`X-Forwarded-For` ولا تستبدلها، فالجزء الأول من تلك
 * الترويسة هو ما كتبه العميل نفسه. فكان يكفي إرسال `X-Forwarded-For`
 * عشوائية مع كل طلب ليصير لكل طلب مفتاحُه — وتسقط حدود التقديم والرفع
 * والمسودّة والزيارة كلها معًا.
 *
 * و`CF-Connecting-IP` تكتبها الحافّة ولا تُقبل من العميل، فهي وحدها ما
 * يُعتمد عليه. وما بعدها للبيئات التي لا تمرّ بكلاودفلير (التطوير المحلي).
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  // خارج كلاودفلير: آخر قيمة في السلسلة هي ما كتبه أقرب وكيل، لا ما كتبه
  // العميل. وتبقى قابلة للانتحال بلا وكيل موثوق أمامها — والتطوير المحلي
  // ليس موضع الحراسة.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((v) => v.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip") || "unknown";
}
