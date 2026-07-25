import { NextResponse } from "next/server";
import { deleteResponse, getResponseWithAnswers } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";

// حذف رد فردي (بعد التحقق من صلاحية الوصول إلى النموذج التابع له)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const response = await getResponseWithAnswers(id);
  if (!response)
    return NextResponse.json({ error: "الرد غير موجود" }, { status: 404 });
  if (!(await authorizeForm(response.formId)))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  await deleteResponse(id);
  return NextResponse.json({ ok: true });
}
