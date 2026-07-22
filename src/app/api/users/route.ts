import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

// قائمة المستخدمين (مسؤول فقط)
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

// إضافة مستخدم بكلمة المرور الافتراضية 1234 (مسؤول فقط)
export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { email, role } = await req.json();
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
    return NextResponse.json({ error: "بريد غير صالح" }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: clean } });
  if (exists)
    return NextResponse.json({ error: "البريد مستخدم مسبقًا" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      email: clean,
      role: role === "admin" ? "admin" : "member",
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      mustChangePassword: true,
    },
    select: { id: true, email: true, role: true },
  });
  return NextResponse.json(user);
}
