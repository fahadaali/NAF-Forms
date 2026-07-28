// قراءات جدول الأعضاء لشاشة الصلاحيات.
//
// الكتابة عند الدخول تتولّاها `naf-auth` (upsertMember)، وهذه القراءات
// والتعديلات الإدارية وحدها — لا منطق مصادقة هنا.
import { getDb } from "@/lib/db";
import type { MemberRow, Role } from "@/lib/roles";

export type { MemberRow, Role };

export async function listMembers(): Promise<MemberRow[]> {
  const rows = await getDb().all<{
    user_id: string;
    display_name: string | null;
    email: string | null;
    role: string;
    is_active: number;
    last_seen_at: number | null;
  }>(
    `SELECT user_id, display_name, email, role, is_active, last_seen_at
     FROM members ORDER BY created_at ASC`
  );

  return rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name ?? "",
    email: r.email ?? "",
    role: r.role,
    isActive: Number(r.is_active) === 1,
    lastSeenAt: r.last_seen_at,
  }));
}

/**
 * بريد العضو — يحتاجه التبليغ العكسي وحده.
 *
 * المركز يطابق صفّ الوصول **بالبريد** لا بالمعرّف المركزي، فلا يكفي
 * تمرير `user_id` إليه. وعضوٌ بلا بريد لا يُبلَّغ عنه.
 */
export async function getMemberEmail(userId: string): Promise<string | null> {
  const row = await getDb().first<{ email: string | null }>(
    `SELECT email FROM members WHERE user_id = ?`,
    [userId]
  );
  const email = row?.email?.trim();
  return email ? email : null;
}

/**
 * صلاحية العضو — يحتاجها التبليغ العكسي ليعرضها المركز في صفّ الوصول.
 *
 * والمركز يعرضها ولا يقرؤها في قرار دخول: المصادقة مركزية والصلاحيات
 * موزّعة. وتُرسل مع السحب كما تُرسل مع المنح، فيبقى المسؤول يرى ما كان
 * يملكه المسحوب حين يحتاج معرفته.
 */
export async function getMemberRole(userId: string): Promise<string | null> {
  const row = await getDb().first<{ role: string | null }>(
    `SELECT role FROM members WHERE user_id = ?`,
    [userId]
  );
  const role = row?.role?.trim();
  return role ? role : null;
}

export async function setMemberRole(userId: string, role: Role): Promise<void> {
  await getDb().run(`UPDATE members SET role = ? WHERE user_id = ?`, [role, userId]);
}

export async function setMemberActive(userId: string, isActive: boolean): Promise<void> {
  await getDb().run(`UPDATE members SET is_active = ? WHERE user_id = ?`, [
    isActive ? 1 : 0,
    userId,
  ]);
}

export async function countActiveAdmins(): Promise<number> {
  const row = await getDb().first<{ n: number }>(
    `SELECT COUNT(*) AS n FROM members WHERE role = 'admin' AND is_active = 1`
  );
  return Number(row?.n ?? 0);
}
