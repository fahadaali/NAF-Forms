import { NextResponse } from "next/server";
import {
  updateForm,
  getQuestionIds,
  deleteQuestions,
  updateQuestion,
  createQuestion,
  getFormWithQuestions,
  deleteForm,
} from "@/lib/repo";

// حفظ النموذج: البيانات الوصفية + الإعدادات + الأسئلة (upsert)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const formId = (await params).id;

  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.type !== undefined) data.type = body.type;
  if (body.status !== undefined) data.status = body.status;
  if (body.settings !== undefined)
    data.settings = JSON.stringify(body.settings);

  await updateForm(formId, data);

  // مزامنة الأسئلة إن أُرسلت
  if (Array.isArray(body.questions)) {
    const incoming = body.questions as any[];
    const existing = await getQuestionIds(formId);
    const incomingIds = new Set(
      incoming.filter((q) => q.id && !q.id.startsWith("tmp-")).map((q) => q.id)
    );
    // حذف المُزالة
    const toDelete = existing.filter((id) => !incomingIds.has(id));
    if (toDelete.length) await deleteQuestions(toDelete);
    // تحديث/إنشاء
    for (let i = 0; i < incoming.length; i++) {
      const q = incoming[i];
      const payload = {
        order: i,
        type: q.type,
        label: q.label || "",
        description: q.description || "",
        required: !!q.required,
        config: JSON.stringify(q.config || {}),
      };
      if (q.id && !q.id.startsWith("tmp-")) {
        await updateQuestion(q.id, payload);
      } else {
        await createQuestion(formId, payload);
      }
    }
  }

  const fresh = await getFormWithQuestions(formId);
  return NextResponse.json(fresh);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await deleteForm((await params).id);
  return NextResponse.json({ ok: true });
}
