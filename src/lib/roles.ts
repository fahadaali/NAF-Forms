// الصلاحيات ومسمّياتها — بلا استيراد قاعدة بيانات.
//
// ملف مستقل عن `members.ts` عمداً: شاشة الصلاحيات مكوّن عميل، واستيراد
// `members.ts` فيها كان سيجرّ `getDb` ومعه better-sqlite3 إلى حزمة المتصفح.

export const ROLES = ["admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

// المسمّيات مسجَّلة في naf-terms.md — §٢ تسميات الحقول والأعمدة.
export const ROLE_LABEL: Record<Role, string> = {
  admin: "مسؤول",
  editor: "مستخدم (تحرير)",
  viewer: "مستخدم (اطّلاع)",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export interface MemberRow {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastSeenAt: number | null;
}
