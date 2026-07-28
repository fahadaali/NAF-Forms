// إعداد الدخول الموحّد لهذه المنصة.
//
// كل ما هنا إعدادٌ ووصلٌ بالنظام القائم. ومنطق المصادقة — التحقق من التوقيع
// و`iss` و`aud` و`exp`، وتنقية `next`، والمبادلة، والجلسة، والكوكي — في
// `src/lib/naf-id/` ولا يُنسخ هنا.
//
// والمسارات العامة مكتوبة في `naf-id/config.ts` وأي مسار سواها محمي
// افتراضياً. والأصول الساكنة مستثناة قبل ذلك في `matcher` بـ src/middleware.ts.
import { nafIdConfig, type Claims, type NafIdConfig } from "@/lib/naf-id";

export { nafIdConfig as ssoConfig };
export type { NafIdConfig };

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
export async function linkExistingUser(
  claims: Claims,
  env: Record<string, unknown>
): Promise<void> {
  const db = env.DB as D1Database;
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
    .first<{ id: string; role: string }>();
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
       ON CONFLICT(user_id) DO NOTHING`
    )
    .bind(sub, claims.name ?? null, email, mapLegacyRole(String(legacy.role)), now)
    .run();

  await db
    .prepare(
      `INSERT INTO "MemberLink" ("user_id", "localUserId", "linkedAt", "linkedBy")
       VALUES (?, ?, ?, 'email_match')
       ON CONFLICT("user_id") DO NOTHING`
    )
    .bind(sub, legacy.id, now)
    .run();
}

/** ترويسات يحقنها الوسيط ليقرأها الخادم — لا تأتي من المتصفح أبداً. */
export const H_SUB = "x-naf-sub";
export const H_ROLE = "x-naf-role";
export const H_PERMS = "x-naf-perms";
