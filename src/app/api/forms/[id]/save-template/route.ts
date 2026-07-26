import { NextResponse } from "next/server";
import { ensureProject, createForm } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";
import { NAF_MUTED_FOREGROUND } from "@/lib/brand";

const TEMPLATES_PROJECT_ID = "system-templates";

// حفظ نسخة من النموذج كقالب جاهز قابل لإعادة الاستخدام
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeForm((await params).id);
  if (!auth)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  const src = auth.form;

  // التأكد من وجود مشروع القوالب
  await ensureProject({
    id: TEMPLATES_PROJECT_ID,
    name: "قوالب النظام",
    description: "قوالب جاهزة للاستخدام السريع",
    color: NAF_MUTED_FOREGROUND,
  });

  const tpl = await createForm(
    {
      slug: `tpl-${slugify(src.title)}-${nanoid(6)}`,
      projectId: TEMPLATES_PROJECT_ID,
      title: src.title,
      description: src.description,
      type: src.type,
      status: "PUBLISHED",
      isTemplate: true,
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
  return NextResponse.json({ ok: true, templateId: tpl.id });
}
