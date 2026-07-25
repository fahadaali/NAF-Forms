import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE, type Session } from "@/lib/auth";
import { getUserById, getFormWithQuestions, getProjectById } from "@/lib/repo";

// قراءة الجلسة من الكوكي (تحقق التوقيع والانتهاء فقط — دون قاعدة البيانات)
async function rawSession(): Promise<Session | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

// الجلسة الحالية مع التحقق من إصدارها في قاعدة البيانات.
// إن غُيّرت كلمة المرور أو أُعيد تعيينها فقد ارتفع sessionVersion، فتُرفض
// كل الكوكيز القديمة (إبطال فعلي للجلسات).
export async function currentSession(): Promise<Session | null> {
  const s = await rawSession();
  if (!s) return null;
  const user = await getUserById(s.uid);
  if (!user) return null;
  if (Number(s.sv ?? 0) !== user.sessionVersion) return null;
  // نعتمد الدور من قاعدة البيانات حتى يسري تغيير الدور فورًا
  return { ...s, role: user.role, mustChange: user.mustChangePassword };
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
