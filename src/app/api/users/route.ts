import { NextResponse } from "next/server";
import { listUsers, getUserByEmail, createUser } from "@/lib/repo";
import { requireAdmin } from "@/lib/session";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

// قائمة المستخدمين (مسؤول فقط)
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const users = await listUsers();
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
    }))
  );
}

// إضافة مستخدم بكلمة المرور الافتراضية 1234 (مسؤول فقط)
export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { email, role } = await req.json();
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
    return NextResponse.json({ error: "بريد غير صالح" }, { status: 400 });
  const exists = await getUserByEmail(clean);
  if (exists)
    return NextResponse.json({ error: "البريد مستخدم مسبقًا" }, { status: 409 });

  const user = await createUser({
    email: clean,
    role: role === "admin" ? "admin" : "member",
    passwordHash: await hashPassword(DEFAULT_PASSWORD),
    mustChangePassword: true,
  });
  return NextResponse.json({ id: user.id, email: user.email, role: user.role });
}
