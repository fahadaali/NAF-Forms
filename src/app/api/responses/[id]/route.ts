import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// حذف رد فردي
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await prisma.response.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
