// إعداد الدخول الموحّد لهذه المنصة.
//
// كل ما هنا إعدادٌ ووصلٌ بالنظام القائم. لا منطق مصادقة: التحقق من التوقيع
// و`iss` و`aud` و`exp`، وتنقية `next`، والحالة العابرة، والكوكي — كلها في
// `naf-auth` ولا تُنسخ هنا (§٤ من وثيقة الربط).
import { createConfig, type AuthConfig, type Claims } from "naf-auth";

// المسارات العامة مكتوبة صراحةً لهذه المنصة، وأي مسار غيرها محمي افتراضياً.
// والأصول الساكنة مستثناة قبل ذلك في `matcher` بـ src/middleware.ts.
const PUBLIC_EXACT = [
  "/auth/callback", // مسار الاستقبال — لا يُحمى وإلا استحال الدخول
  "/denied", // صفحة الرفض
  "/api/upload", // رفع مرفق من نموذج عام
  "/api/logout",
  // إشعار الخروج الخلفي من المركز: المنادي خادم لا متصفّح، ولا جلسة له هنا
  // يُحرَس بها المسار — وحراستُه توقيعُ المركز تتحقّق منه الحزمة.
  "/auth/backchannel-logout",
];

const PUBLIC_PREFIXES = [
  "/f/", // تعبئة النموذج — جوهر المنتج، بلا حساب
  "/api/f/",
  "/uploads/", // مرفقات تُعرض داخل النماذج العامة (قد لا تحمل امتداداً)
  "/certificate/", // شهادة الاختبار — تُفتح بمعرّف الرد العشوائي
];

// أدوار هذه المنصة مقابل أدوار جدول `User` القائم.
// القرار: `member` القائم يقابل `editor` فيحتفظ بقدرته على الإنشاء والتحرير،
// و`viewer` هو الدور الافتراضي لمن يدخل أول مرة بلا سجلّ سابق.
function mapLegacyRole(role: string): string {
  return role === "admin" ? "admin" : "editor";
}

/**
 * نقطة التعليق بين التحقق والإدراج.
 *
 * المنصة لها مستخدمون سابقون وملكية مبنية على `"User"."id"`، فأول دخول
 * موحّد لصاحب بريد مسجَّل يربط `sub` بسجلّه المحلي بدل أن يُنشأ له سجلّ
 * ثانٍ — ولولا هذا لفقد كل مشاريعه ونماذجه صامتاً.
 *
 * ويُدرَج صفّ `members` هنا بالدور المشتقّ من دوره القديم، فيصل
 * `upsertMember` بعده إلى `ON CONFLICT` ولا يُنزله إلى الدور الافتراضي.
 */
async function linkExistingUser(claims: Claims, env: any, config: AuthConfig) {
  const db = env[config.dbBinding];
  const sub = claims.sub;

  // مربوط سلفاً: لا شيء يُفعل. الدخول الثاني يمرّ من هنا.
  const linked = await db
    .prepare(`SELECT "user_id" FROM "MemberLink" WHERE "user_id" = ?`)
    .bind(sub)
    .first();
  if (linked) return;

  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email) return; // بلا بريد لا مطابقة — يُنشأ عضو جديد بالدور الافتراضي

  const legacy = await db
    .prepare(`SELECT "id", "role" FROM "User" WHERE "email" = ?`)
    .bind(email)
    .first();
  if (!legacy) return;

  // المستخدم المحلي مربوط بهوية مركزية أخرى: لا يُربط مرتين.
  // الفهرس الفريد يمنع ذلك أصلاً، والفحص هنا ليُنشأ العضو بالدور الافتراضي
  // بدل أن تسقط عملية الدخول كلها بخطأ قيد.
  const taken = await db
    .prepare(`SELECT "user_id" FROM "MemberLink" WHERE "localUserId" = ?`)
    .bind(legacy.id)
    .first();
  if (taken) return;

  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO members (user_id, display_name, email, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(user_id) DO NOTHING`,
    )
    .bind(sub, claims.name ?? null, email, mapLegacyRole(String(legacy.role)), now)
    .run();

  await db
    .prepare(
      `INSERT INTO "MemberLink" ("user_id", "localUserId", "linkedAt", "linkedBy")
       VALUES (?, ?, ?, 'email_match')
       ON CONFLICT("user_id") DO NOTHING`,
    )
    .bind(sub, legacy.id, now)
    .run();
}

/**
 * سجلّ الأخطاء — الرمز وحده لا يكفي.
 *
 * كل فشل في المبادلة يصل المستخدمَ `auth_failed` واحداً، فبلا حالة ردّ
 * المركز يستوي في اللوغ سرٌّ خاطئ وصفُّ وصول مفقود وجدولٌ لم يُهاجَر.
 * والفرق بين تشخيص في دقيقة وآخر في ساعة هو هذا السطر:
 *
 *   secret_missing               السرّ غير مضبوط
 *   exchange_failed — … (401)    السرّ خاطئ أو PLATFORM_ID لا يطابق
 *   exchange_failed — … (400)    رمز عبور مستهلَك — ابدأ من `/` ولا تحدّث الصفحة
 *   exchange_failed — … (403)    لا صفّ `granted` في `platform_access`
 *   bad_issuer / bad_audience    AUTH_ISSUER أو PLATFORM_ID لا يطابق حرفياً
 *   callback_failed — no such table   هجرة `members` لم تُطبَّق
 *
 * والرسالة تُسجَّل ولا تُعرض: الحزمة لا تُرفق نصّ استجابة المركز فيها،
 * وصفحة الرفض تعرض رمز سبب ثابتاً لا تفصيلاً تقنياً.
 */
function logAuthError(code: string, err: unknown) {
  const message = err instanceof Error ? err.message : "";
  const detail = message && message !== code ? ` — ${message}` : "";
  console.error(`naf-auth: ${code}${detail}`);
}

/** إعداد naf-auth لهذه المنصة. القيم المتغيّرة كلها من `wrangler.toml`. */
export function ssoConfig(env: any): AuthConfig {
  return createConfig(env, {
    publicPaths: PUBLIC_EXACT,
    publicPrefixes: PUBLIC_PREFIXES,
    onClaims: linkExistingUser,
    onError: logAuthError,
  });
}

/** ترويسات يحقنها الوسيط ليقرأها الخادم — لا تأتي من المتصفح أبداً. */
export const H_SUB = "x-naf-sub";
export const H_ROLE = "x-naf-role";
export const H_PERMS = "x-naf-perms";
