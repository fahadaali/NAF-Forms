import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// حفظ النموذج: البيانات الوصفية + الإعدادات + الأسئلة (upsert)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const formId = params.id;

  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.type !== undefined) data.type = body.type;
  if (body.status !== undefined) data.status = body.status;
  if (body.settings !== undefined)
    data.settings = JSON.stringify(body.settings);

  await prisma.form.update({ where: { id: formId }, data });

  // مزامنة الأسئلة إن أُرسلت
  if (Array.isArray(body.questions)) {
    const incoming = body.questions as any[];
    const existing = await prisma.question.findMany({
      where: { formId },
      select: { id: true },
    });
    const incomingIds = new Set(
      incoming.filter((q) => q.id && !q.id.startsWith("tmp-")).map((q) => q.id)
    );
    // حذف المُزالة
    const toDelete = existing.filter((e) => !incomingIds.has(e.id));
    if (toDelete.length)
      await prisma.question.deleteMany({
        where: { id: { in: toDelete.map((d) => d.id) } },
      });
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
        await prisma.question.update({ where: { id: q.id }, data: payload });
      } else {
        await prisma.question.create({ data: { ...payload, formId } });
      }
    }
  }

  const fresh = await prisma.form.findUnique({
    where: { id: formId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(fresh);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.form.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
