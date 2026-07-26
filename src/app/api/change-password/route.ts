import { NextResponse } from "next/server";
import { updateUser } from "@/lib/repo";
import { currentSession } from "@/lib/session";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

// تعيين كلمة مرور جديدة (يُستخدم عند أول دخول أو لتغييرها لاحقًا)
export async function POST(req: Request) {
  // currentSession يتحقق أيضًا من إصدار الجلسة (فالجلسات المُبطلة لا تُقبل)
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 401 });

  const { newPassword } = await req.json();
  const pw = String(newPassword || "");
  if (pw.length < 4)
    return NextResponse.json(
      { error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" },
      { status: 400 }
    );

  // تغيير كلمة المرور يُبطل كل الجلسات القديمة (زيادة إصدار الجلسة)
  const updated = await updateUser(session.uid, {
    passwordHash: await hashPassword(pw),
    mustChangePassword: false,
    bumpSessionVersion: true,
  });
  if (!updated)
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  // إعادة إصدار جلسة هذا الجهاز بالإصدار الجديد
  const token = await signSession({
    uid: session.uid,
    role: updated.role,
    mustChange: false,
    sv: updated.sessionVersion,
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
