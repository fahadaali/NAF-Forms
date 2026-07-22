import { NextResponse } from "next/server";
import { createProject } from "@/lib/repo";

export async function POST(req: Request) {
  const body = await req.json();
  const project = await createProject({
    name: body.name?.trim() || "مشروع جديد",
    description: body.description || "",
    color: body.color || "#44528a",
  });
  return NextResponse.json(project);
}
