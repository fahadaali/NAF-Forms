import { headers } from "next/headers";
import { type Session } from "@/lib/auth";
import { getFormWithQuestions, getProjectById } from "@/lib/repo";
import { getDb } from "@/lib/db";
import { H_SUB, H_ROLE } from "@/lib/sso";

// الجلسة تأتي من الدخول الموحّد لا من كوكي محلي.
//
// الوسيط تحقّق من الرمز في هذا الطلب عبر `naf-id` وقرأ العضو من قاعدة هذه
// المنصة، ثم حقن هويته في ترويسات الطلب. فلا تحقّق ثانياً هنا — ومصدر واحد
// للحقيقة.
// والترويسات تُمسح من الطلب الوارد في الوسيط قبل حقنها، فلا تُنتحل.
//
// واجهة هذا الملف لم تتغيّر: كل ما يستدعي `currentSession` أو `requireAdmin`
// يعمل كما كان دون تعديل سطر فيه.

// المعرّف المحلي المربوط بهوية المركز — وهو ما تحمله "Project"."ownerId"
// و "Form"."ownerId" لكل ما أُنشئ قبل الدخول الموحّد.
async function localUserId(sub: string): Promise<string> {
  const row = await getDb().first<{ localUserId: string }>(
    `SELECT "localUserId" FROM "MemberLink" WHERE "user_id" = ?`,
    [sub]
  );
  // بلا ربط — عضو جديد بلا سجلّ سابق: يملك باسم معرّفه المركزي.
  return row?.localUserId ?? sub;
}

export async function currentSession(): Promise<Session | null> {
  const h = await headers();
  const sub = h.get(H_SUB);
  const role = h.get(H_ROLE);
  if (!sub || !role) return null;

  return {
    uid: await localUserId(sub),
    role,
    // تغيير كلمة المرور شأن المركز، فلا إلزام محلي بعد اليوم.
    mustChange: false,
    sv: 0,
    exp: 0,
  };
}

export async function requireAdmin(): Promise<Session | null> {
  const s = await currentSession();
  return s && s.role === "admin" ? s : null;
}

// ===== الصلاحيات =====
// المسؤول يملك وصولًا كاملًا؛ والعضو يصل إلى ما يملكه فقط.
export function isAdmin(s: Session | null): boolean {
  return !!s && s.role === "admin";
}

// معرّف المالك المستخدم في تصفية القوائم: null للمسؤول (بلا تصفية)
export function ownerFilter(s: Session | null): string | null {
  return isAdmin(s) ? null : s?.uid ?? "__none__";
}

export function canAccessOwned(
  s: Session | null,
  ownerId: string | undefined | null
): boolean {
  if (!s) return false;
  if (isAdmin(s)) return true;
  return !!ownerId && ownerId === s.uid;
}

// التحقق من صلاحية الوصول إلى نموذج (يُرجع النموذج أو null)
export async function authorizeForm(formId: string) {
  const s = await currentSession();
  if (!s) return null;
  const form = await getFormWithQuestions(formId);
  if (!form) return null;
  return canAccessOwned(s, form.ownerId) ? { session: s, form } : null;
}

// التحقق من صلاحية الوصول إلى مشروع (يُرجع المشروع أو null)
export async function authorizeProject(projectId: string) {
  const s = await currentSession();
  if (!s) return null;
  const project = await getProjectById(projectId);
  if (!project) return null;
  return canAccessOwned(s, project.ownerId) ? { session: s, project } : null;
}
