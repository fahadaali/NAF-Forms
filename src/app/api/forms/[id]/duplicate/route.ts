import { NextResponse } from "next/server";
import { createForm } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";

// نسخ نموذج بكامل أسئلته وإعداداته داخل نفس المشروع
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeForm((await params).id);
  if (!auth)
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const src = auth.form;

  const copy = await createForm(
    {
      slug: `${slugify(src.title)}-${nanoid(6)}`,
      projectId: src.projectId,
      title: `${src.title} (نسخة)`,
      description: src.description,
      type: src.type,
      status: "DRAFT",
      settings: src.settings,
      ownerId: auth.session.uid,
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
