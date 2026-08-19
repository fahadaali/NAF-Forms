/**
 * حارس وجهة النداء الخارجي — وحدة نقيّة بلا استيراد.
 *
 * كان هذا المنطق داخل `deliver.ts`، وذلك الملف يستورد `repo` ومعه طبقة
 * قاعدة البيانات وربط Workers. فحارسٌ أمني لا يُختبَر إلا بتحميل نصف
 * التطبيق لا يُختبَر عملياً — وهو أولى ما يُختبر.
 *
 * ---
 *
 * الرابط يكتبه محرّر النموذج، والنداء يخرج من خادمنا. فبلا فحص يصير حقلُ
 * إعدادات أداةَ طلبٍ من داخل شبكتنا: `http://169.254.169.254/…` لبيانات
 * المثيل، أو `file:`، أو خدمة داخلية لا تُبلَغ من الخارج.
 */

// النطاقات المحجوزة والعناوين الخاصة. تُفحص على اسم المضيف بعد التحليل،
// لا على النصّ الخام — فالنصّ الخام يُخفي المضيف خلف `@` أو ترميز.
const PRIVATE_HOST = new RegExp(
  [
    "^localhost$",
    "\\.local$",
    "\\.internal$",
    "\\.localhost$",
    "^\\[?::1\\]?$",
    "^0\\.0\\.0\\.0$",
    "^127\\.",
    "^10\\.",
    "^169\\.254\\.", // بيانات المثيل
    "^192\\.168\\.",
    "^172\\.(1[6-9]|2\\d|3[01])\\.",
    "^100\\.(6[4-9]|[7-9]\\d|1[01]\\d|12[0-7])\\.", // CGNAT
  ].join("|"),
  "i"
);

/** هل يصحّ أن يُنادى هذا الرابط من الخادم؟ */
export function isDeliverableUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  // `https` وحده: `http` يمرّ بلا تعمية، و`file:`/`data:` ليسا وجهة أصلاً
  if (url.protocol !== "https:") return false;
  // بيانات اعتماد في الرابط (`https://user@host`) تُستعمل للتمويه على القارئ
  if (url.username || url.password) return false;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) return false;
  if (PRIVATE_HOST.test(host)) return false;
  // عنوان IPv6 محلّي بصيغة مختصرة
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) return false;
  return true;
}
