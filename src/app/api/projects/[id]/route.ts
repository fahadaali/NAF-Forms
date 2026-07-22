import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const project = await prisma.project.update({
    where: { id: (await params).id },
    data: {
      name: body.name,
      description: body.description,
      color: body.color,
    },
  });
  return NextResponse.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await prisma.project.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
