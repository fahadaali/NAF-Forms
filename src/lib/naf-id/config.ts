// عميل naf-id — الإعداد.
//
// لا معرّف منصة ولا نطاق مكتوب هنا: كلاهما من `[vars]` في `wrangler.toml`،
// والسرّ من `wrangler secret` ولا يُقرأ إلا في لحظة المبادلة.

/** عمر الرمز الموقّع عند المركز: خمس عشرة دقيقة. */
export const TOKEN_SECONDS = 15 * 60;

/** تخبئة المفاتيح العامة: خمس دقائق كما نصّت وثيقة المركز. */
export const JWKS_TTL_SECONDS = 5 * 60;

/**
 * فارق الساعة المسموح به عند فحص `exp`: ستون ثانية.
 * ساعتان لا تتطابقان إلى الثانية، ومنعُ ذلك يرفض رموزاً صحيحة.
 */
export const CLOCK_SKEW_SECONDS = 60;

/**
 * عمر جلسة المنصة = عمر الرمز نفسه.
 *
 * جلسةٌ أطول من الرمز تجعل الإيقاف المركزي بلا أثر حتى تنقضي: من أُوقف في
 * المركز يظلّ داخلاً بجلسته المحلية. وقِصَر الرمز هو بالضبط ما يجعل الإيقاف
 * يسري خلال ربع ساعة دون أن تسأل المنصةُ المركزَ في كل طلب.
 */
export const SESSION_TTL_SECONDS = TOKEN_SECONDS;

/** رموز أسباب الرفض. رموزٌ لا جُمَل — النصّ من `naf-terms.md` في الصفحة. */
export const REASONS = {
  inactive: "inactive",
  notMember: "not_member",
  authFailed: "auth_failed",
} as const;

export type DeniedReason = (typeof REASONS)[keyof typeof REASONS];

export interface NafIdConfig {
  issuer: string;
  platformId: string;
  cookieName: string;
  defaultRole: string;
  deniedPath: string;
  publicPaths: readonly string[];
  publicPrefixes: readonly string[];
}

function required(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`naf-id: ${name} مطلوب ولا يُخمَّن`);
  }
  return value.trim();
}

/**
 * المُصدِر يُقرأ كما كُتب ولا يُطبَّع.
 *
 * المقارنة مع `iss` حرفية، فالشرطة المائلة الأخيرة فرقٌ حقيقي. وحذفها هنا
 * صامتاً يخفي خطأً في `wrangler.toml` حتى يظهر رفضاً بلا سبب مقروء — فالأولى
 * أن يفشل الإعداد في وجه من كتبه.
 */
function readIssuer(env: Record<string, unknown>): string {
  const issuer = required(env.AUTH_ISSUER, "AUTH_ISSUER");
  if (issuer.endsWith("/")) {
    throw new Error("naf-id: AUTH_ISSUER بلا شرطة مائلة أخيرة — المقارنة مع iss حرفية");
  }
  if (!issuer.startsWith("https://")) {
    throw new Error("naf-id: AUTH_ISSUER يبدأ بـ https");
  }
  return issuer;
}

/**
 * المسارات العامة مكتوبة صراحةً، وكل مسار سواها محمي افتراضياً.
 * المطابقة بالمساواة التامة أو ببادئة مُعلنة — لا أنماط ولا اجتهاد.
 */
const PUBLIC_EXACT = [
  "/auth/callback", // مسار الاستقبال — لا يُحمى وإلا استحال الدخول
  "/denied", // صفحة الرفض
  "/api/upload", // رفع مرفق من نموذج عام
  "/api/logout",
] as const;

const PUBLIC_PREFIXES = [
  "/f/", // تعبئة النموذج — جوهر المنتج، بلا حساب
  "/api/f/",
  "/uploads/", // مرفقات تُعرض داخل النماذج العامة (قد لا تحمل امتداداً)
  "/certificate/", // شهادة الاختبار — تُفتح بمعرّف الردّ العشوائي

  // الواجهة البرمجية للتكاملات. عامّة أمام الوسيط لا أمام الشبكة: تحمل
  // مصادقتها بنفسها — رمزٌ خاصّ بكل نموذج، يُقارن بزمن ثابت، ولا يعمل إلا
  // إذا فُعّلت الواجهة لذلك النموذج، ومعه حدّ معدّل.
  //
  // وبدون هذا السطر يردّ الوسيط ٤٠١ على كل آلة تستدعيها: الآلة لا تملك كوكي
  // جلسة ولا تستطيع أن تمرّ بباب المركز، فالحماية بالجلسة تقطع التكامل ولا
  // تحميه.
  "/api/v1/",
] as const;

export function nafIdConfig(env: Record<string, unknown>): NafIdConfig {
  return {
    issuer: readIssuer(env),
    // المعرّف حسّاس لحالة الأحرف ولا يُطبَّع: `aud` يُقارن به حرفياً،
    // ومنصةٌ تُصغّر اسمها ترفض كل رمز صحيح — والرفض صامت يصعب تشخيصه.
    platformId: required(env.PLATFORM_ID, "PLATFORM_ID"),
    cookieName: typeof env.AUTH_COOKIE_NAME === "string" ? env.AUTH_COOKIE_NAME : "naf_sid",
    defaultRole: typeof env.DEFAULT_ROLE === "string" ? env.DEFAULT_ROLE : "viewer",
    deniedPath: "/denied",
    publicPaths: PUBLIC_EXACT,
    publicPrefixes: PUBLIC_PREFIXES,
  };
}

export function isPublicPath(pathname: string, config: NafIdConfig): boolean {
  if (config.publicPaths.includes(pathname as (typeof PUBLIC_EXACT)[number])) return true;
  return config.publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/** مساحة KV — للجلسة ولكاش المفاتيح. غيابها خطأ إعداد لا يُتجاوَز بصمت. */
export function authKv(env: Record<string, unknown>): KVNamespace {
  const ns = env.AUTH_KV as KVNamespace | undefined;
  if (!ns) throw new Error("naf-id: مساحة AUTH_KV غير مربوطة");
  return ns;
}
