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
