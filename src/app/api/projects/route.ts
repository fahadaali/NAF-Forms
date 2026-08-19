import { NextResponse } from "next/server";
import { createProject } from "@/lib/repo";
import { currentSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 401 });

  const body = await req.json();
  if (body.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(body.color)))
    return NextResponse.json({ error: "لون غير صالح" }, { status: 400 });

  const project = await createProject({
    name: String(body.name ?? "").trim().slice(0, 200) || "مشروع جديد",
    description: String(body.description ?? "").slice(0, 2000),
    color: body.color || undefined,
    ownerId: session.uid,
  });
  return NextResponse.json(project);
}
