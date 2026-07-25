import { NextResponse } from "next/server";
import { updateProject, deleteProject } from "@/lib/repo";
import { authorizeProject } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  if (!(await authorizeProject(id)))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json();
  const project = await updateProject(id, {
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
  const id = (await params).id;
  if (!(await authorizeProject(id)))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
