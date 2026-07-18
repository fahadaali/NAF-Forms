import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";

const TEMPLATES_PROJECT_ID = "system-templates";

// حفظ نسخة من النموذج كقالب جاهز قابل لإعادة الاستخدام
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const src = await prisma.form.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!src)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });

  // التأكد من وجود مشروع القوالب
  await prisma.project.upsert({
    where: { id: TEMPLATES_PROJECT_ID },
    update: {},
    create: {
      id: TEMPLATES_PROJECT_ID,
      name: "قوالب النظام",
      description: "قوالب جاهزة للاستخدام السريع",
      color: "#64748b",
    },
  });

  const tpl = await prisma.form.create({
    data: {
      slug: `tpl-${slugify(src.title)}-${nanoid(6)}`,
      projectId: TEMPLATES_PROJECT_ID,
      title: src.title,
      description: src.description,
      type: src.type,
      status: "PUBLISHED",
      isTemplate: true,
      settings: src.settings,
      questions: {
        create: src.questions.map((q) => ({
          order: q.order,
          type: q.type,
          label: q.label,
          description: q.description,
          required: q.required,
          config: q.config,
        })),
      },
    },
  });
  return NextResponse.json({ ok: true, templateId: tpl.id });
}
