import { NextResponse } from "next/server";
import {
  updateForm,
  getQuestionIds,
  deleteQuestions,
  updateQuestion,
  createQuestion,
  getFormWithQuestions,
  deleteForm,
  isSlugAvailable,
} from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { isFormStatus, isFormType } from "@/lib/field-types";

// حفظ النموذج: البيانات الوصفية + الإعدادات + الأسئلة (upsert)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const formId = (await params).id;

  if (!(await authorizeForm(formId)))
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });

  const data: any = {};

  // تعديل رابط النموذج (يجب أن يكون ASCII وغير مستخدم)
  if (body.slug !== undefined) {
    const clean = slugify(String(body.slug));
    if (clean !== String(body.slug).trim().toLowerCase())
      return NextResponse.json(
        { error: "الرابط يجب أن يحتوي حروفًا إنجليزية وأرقامًا وشرطات فقط" },
        { status: 400 }
      );
    if (!(await isSlugAvailable(clean, formId)))
      return NextResponse.json(
        { error: "هذا الرابط مستخدم في نموذج آخر" },
        { status: 409 }
      );
    data.slug = clean;
  }
  if (body.title !== undefined) data.title = String(body.title).slice(0, 300);
  if (body.description !== undefined)
    data.description = String(body.description).slice(0, 5000);
  // النوع والحالة من القيم المسجَّلة وحدها: كانا يُكتبان كما وصلا، فحالةٌ
  // مجهولة تجعل النموذج لا منشورًا ولا مغلقًا ولا مسودة — وكل شاشة تقرؤها
  // تعرض فراغًا لأن `FORM_STATUS_LABELS[status]` غير معرّفة.
  if (body.type !== undefined) {
    if (!isFormType(body.type))
      return NextResponse.json({ error: "نوع غير معروف" }, { status: 400 });
    data.type = body.type;
  }
  if (body.status !== undefined) {
    if (!isFormStatus(body.status))
      return NextResponse.json({ error: "حالة غير معروفة" }, { status: 400 });
    data.status = body.status;
  }
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
    if (toDelete.length) await deleteQuestions(formId, toDelete);
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
      /* معرّف السؤال يأتي من العميل، فالتحديث مقيَّد بالنموذج المصرَّح
         عليه (`updateQuestion` تحمل `formId` في شرطها). ومعرّفٌ لا ينتمي
         إليه لا يُحدِّث شيئًا ولا يُنشئ شيئًا — يُردّ الطلب كله بدل أن
         يمرّ نصفه. */
      if (q.id && !q.id.startsWith("tmp-")) {
        if (!existing.includes(q.id))
          return NextResponse.json(
            { error: "هذا السؤال لا ينتمي إلى هذا النموذج" },
            { status: 400 }
          );
        await updateQuestion(formId, q.id, payload);
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
  const formId = (await params).id;
  if (!(await authorizeForm(formId)))
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  await deleteForm(formId);
  return NextResponse.json({ ok: true });
}
