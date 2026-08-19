import { NextResponse } from "next/server";
import { updateProject, deleteProject } from "@/lib/repo";
import { authorizeProject } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  if (!(await authorizeProject(id)))
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });

  const body = await req.json();

  /* اللون يُخزَّن في D1 نصًّا ثم يُوضع في `style={{ background }}` في
     الصفحة الرئيسية وصفحة المشروع. فيُقيَّد بصيغة hex — وهي الصيغة
     الوحيدة التي يُصدرها `<input type="color">` في شاشة الإعدادات. */
  if (body.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(body.color)))
    return NextResponse.json({ error: "لون غير صالح" }, { status: 400 });

  const project = await updateProject(id, {
    name: body.name === undefined ? undefined : String(body.name).slice(0, 200),
    description:
      body.description === undefined
        ? undefined
        : String(body.description).slice(0, 2000),
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
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
