import { NextResponse } from "next/server";
import { getFormWithQuestions, createForm } from "@/lib/repo";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";

// إنشاء نموذج جديد: فارغ أو من قالب جاهز
export async function POST(req: Request) {
  const body = await req.json();
  const projectId: string = body.projectId;
  if (!projectId)
    return NextResponse.json({ error: "projectId مطلوب" }, { status: 400 });

  const title = body.title?.trim() || "نموذج بدون عنوان";
  const slug = `${slugify(title)}-${nanoid(6)}`;

  // من قالب جاهز
  if (body.templateId) {
    const tpl = await getFormWithQuestions(body.templateId);
    if (!tpl)
      return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
    const form = await createForm(
      {
        slug,
        projectId,
        title: body.title?.trim() || tpl.title,
        description: tpl.description,
        type: tpl.type,
        status: "DRAFT",
        settings: tpl.settings,
      },
      tpl.questions.map((q) => ({
        order: q.order,
        type: q.type,
        label: q.label,
        description: q.description,
        required: q.required,
        config: q.config,
      }))
    );
    return NextResponse.json(form);
  }

  // نموذج فارغ
  const form = await createForm({
    slug,
    projectId,
    title,
    type: body.type || "SURVEY",
    status: "DRAFT",
  });
  return NextResponse.json(form);
}
