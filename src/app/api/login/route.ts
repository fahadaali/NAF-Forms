import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

// تسجيل الدخول بالبريد وكلمة المرور
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({
      where: { email: String(email || "").trim().toLowerCase() },
    });
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
  } catch (e: any) {
    // تشخيص مؤقّت: إظهار الخطأ الحقيقي
    return NextResponse.json(
      { ok: false, error: "DEBUG: " + (e?.message || String(e)) },
      { status: 500 }
    );
  }
}
