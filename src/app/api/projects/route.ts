import { NextResponse } from "next/server";
import { createProject } from "@/lib/repo";
import { currentSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 401 });

  const body = await req.json();
  const project = await createProject({
    name: body.name?.trim() || "مشروع جديد",
    description: body.description || "",
    color: body.color || undefined,
    ownerId: session.uid,
  });
  return NextResponse.json(project);
}
