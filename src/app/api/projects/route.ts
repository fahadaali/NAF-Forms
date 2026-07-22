import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name?.trim() || "مشروع جديد",
      description: body.description || "",
      color: body.color || "#44528a",
    },
  });
  return NextResponse.json(project);
}
