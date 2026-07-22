import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

// تعديل مستخدم: تغيير الدور أو إعادة تعيين كلمة المرور (مسؤول فقط)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await req.json();

  const data: any = {};
  if (body.role) data.role = body.role === "admin" ? "admin" : "member";
  if (body.action === "reset") {
    data.passwordHash = await hashPassword(DEFAULT_PASSWORD);
    data.mustChangePassword = true;
  }
  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, role: true, mustChangePassword: true },
  });
  return NextResponse.json(user);
}

// حذف مستخدم (مسؤول فقط، ولا يحذف نفسه)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (admin.uid === params.id)
    return NextResponse.json(
      { error: "لا يمكنك حذف حسابك" },
      { status: 400 }
    );
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
