import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifySession,
  hashPassword,
  signSession,
  SESSION_COOKIE,
} from "@/lib/auth";

// تعيين كلمة مرور جديدة (يُستخدم عند أول دخول أو لتغييرها لاحقًا)
export async function POST(req: Request) {
  const session = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!session)
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { newPassword } = await req.json();
  const pw = String(newPassword || "");
  if (pw.length < 4)
    return NextResponse.json(
      { error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" },
      { status: 400 }
    );

  await prisma.user.update({
    where: { id: session.uid },
    data: { passwordHash: await hashPassword(pw), mustChangePassword: false },
  });

  // إعادة إصدار الجلسة بحالة mustChange = false
  const token = await signSession({
    uid: session.uid,
    role: session.role,
    mustChange: false,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
