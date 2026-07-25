import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/repo";
import { verifyPassword, signSession, SESSION_COOKIE } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// تسجيل الدخول بالبريد وكلمة المرور
export async function POST(req: Request) {
  // حدّ لمحاولات الدخول لكل عنوان IP (حماية من التخمين المتكرر)
  if (!rateLimit(`login:${clientIp(req)}`, 10, 5 * 60_000))
    return NextResponse.json(
      { ok: false, error: "محاولات دخول كثيرة، حاول بعد قليل" },
      { status: 429 }
    );

  const { email, password } = await req.json();
  const user = await getUserByEmail(String(email || "").trim().toLowerCase());
  if (!user || !(await verifyPassword(String(password || ""), user.passwordHash))) {
    return NextResponse.json(
      { ok: false, error: "البريد أو كلمة المرور غير صحيحة" },
      { status: 401 }
    );
  }
  const token = await signSession({
    uid: user.id,
    role: user.role,
    mustChange: user.mustChangePassword,
    sv: user.sessionVersion,
  });
  const res = NextResponse.json({
    ok: true,
    mustChange: user.mustChangePassword,
    role: user.role,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
