import { NextResponse } from "next/server";
import { getFormWithQuestions, createForm } from "@/lib/repo";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";

// نسخ نموذج بكامل أسئلته وإعداداته داخل نفس المشروع
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const src = await getFormWithQuestions((await params).id);
  if (!src)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });

  const copy = await createForm(
    {
      slug: `${slugify(src.title)}-${nanoid(6)}`,
      projectId: src.projectId,
      title: `${src.title} (نسخة)`,
      description: src.description,
      type: src.type,
      status: "DRAFT",
      settings: src.settings,
    },
    src.questions.map((q) => ({
      order: q.order,
      type: q.type,
      label: q.label,
      description: q.description,
      required: q.required,
      config: q.config,
    }))
  );
  return NextResponse.json(copy);
}
