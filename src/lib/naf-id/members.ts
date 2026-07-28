// عميل naf-id — جدول الأعضاء المحلي.
//
// المصادقة مركزية والصلاحيات موزّعة: المركز يقول من الزائر وإن له حقّ الدخول،
// والدور داخل هذه المنصة يقرّره جدولها وحده ولا شأن للمركز به.
//
// الاستعلامات هنا على ربط D1 مباشرة لا عبر `lib/db.ts`: الوسيط يعمل في بيئة
// الحافة، و`getDb` تجرّ better-sqlite3 معها فلا تُحمَّل هناك.

import type { NafIdConfig } from "./config";
import type { Claims } from "./verify";

export interface Member {
  id: string;
  role: string;
  perms: unknown;
  isActive: boolean;
}

function db(env: Record<string, unknown>): D1Database {
  const binding = env.DB as D1Database | undefined;
  if (!binding) throw new Error("naf-id: ربط D1 غير موجود (DB)");
  return binding;
}

/** صلاحيات دقيقة تالفة لا تُسقط الطلب — تُعامَل كغير موجودة ويبقى الدور. */
function parsePerms(raw: unknown): unknown {
  if (raw == null || raw === "") return null;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

/** قراءة العضو بمعرّفه المركزي (`sub`). */
export async function getMember(
  env: Record<string, unknown>,
  userId: string
): Promise<Member | null> {
  const row = await db(env)
    .prepare(`SELECT user_id, role, is_active, perms FROM members WHERE user_id = ?`)
    .bind(userId)
    .first<{ user_id: string; role: string; is_active: number; perms: string | null }>();

  if (!row) return null;
  return {
    id: row.user_id,
    role: row.role,
    perms: parsePerms(row.perms),
    isActive: Number(row.is_active) === 1,
  };
}

/**
 * إدراج العضو أو تحديثه عند الاستقبال.
 *
 * أول دخول ينشئ السجلّ بالدور الافتراضي، ثم يرقّيه مسؤول المنصة من إعداداتها.
 * والدخول الثاني يحدّث الاسم والبريد وآخر ظهور — ولا يمسّ:
 *   - الدور: وإلا عاد كل مستخدم إلى الافتراضي عند كل دخول وضاعت الترقية.
 *   - `is_active`: وإلا فُكّ إيقاف الموقوف بمجرّد محاولته الدخول.
 */
export async function upsertMember(
  env: Record<string, unknown>,
  config: NafIdConfig,
  claims: Claims
): Promise<Member | null> {
  const now = Math.floor(Date.now() / 1000);

  await db(env)
    .prepare(
      `INSERT INTO members (user_id, display_name, email, role, is_active, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         display_name = excluded.display_name,
         email        = excluded.email,
         last_seen_at = excluded.last_seen_at`
    )
    .bind(claims.sub, claims.name ?? null, claims.email ?? null, config.defaultRole, now, now)
    .run();

  return getMember(env, claims.sub);
}

/** بريد العضو — يحتاجه التبليغ العكسي، فالمركز يعرف الأعضاء بالبريد. */
export async function memberEmail(
  env: Record<string, unknown>,
  userId: string
): Promise<string | null> {
  const row = await db(env)
    .prepare(`SELECT email FROM members WHERE user_id = ?`)
    .bind(userId)
    .first<{ email: string | null }>();
  return row?.email ?? null;
}
