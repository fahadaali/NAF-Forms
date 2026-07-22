import { NextResponse } from "next/server";
import { updateProject, deleteProject } from "@/lib/repo";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const project = await updateProject((await params).id, {
    name: body.name,
    description: body.description,
    color: body.color,
  });
  return NextResponse.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await deleteProject((await params).id);
  return NextResponse.json({ ok: true });
}
