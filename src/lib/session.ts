import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE, type Session } from "@/lib/auth";

// قراءة الجلسة الحالية من الكوكي (لمكوّنات الخادم ومسارات الـ API)
export async function currentSession(): Promise<Session | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<Session | null> {
  const s = await currentSession();
  return s && s.role === "admin" ? s : null;
}
