import { NextResponse } from "next/server";
import { countOwnedByUser, deleteUser, updateUser } from "@/lib/repo";
import { requireAdmin } from "@/lib/session";

/* تعديل صفّ التهيئة المسبقة (مسؤول فقط).

   **ولا «إعادة تعيين كلمة المرور» بعد اليوم.** كانت تكتب تجزئة `1234`
   وترفع `mustChangePassword` وتزيد `sessionVersion` — ولا شيء من الثلاثة
   يُقرأ منذ الدخول الموحّد: الباب مغلق، و`currentSession` تُرجع
   `mustChange: false` دائمًا، والجلسة في `AUTH_KV` لا في كوكي موقّع محليًا.
   فكان الزرّ يعد بفعلٍ لا يقع. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  const data: { role?: string } = {};
  if (body.role) data.role = body.role === "admin" ? "admin" : "member";
  if (!Object.keys(data).length)
    return NextResponse.json({ error: "هذا الحقل مطلوب" }, { status: 400 });

  const user = await updateUser((await params).id, data);
  if (!user)
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  return NextResponse.json({ id: user.id, email: user.email, role: user.role });
}

// حذف صفّ التهيئة (مسؤول فقط، ولا يحذف نفسه)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  const id = (await params).id;
  if (admin.uid === id)
    return NextResponse.json({ error: "لا يمكنك حذف حسابك" }, { status: 400 });

  /* ═══ لا يُحذف صفٌّ تتعلّق به ملكية ═══

     `"Project"."ownerId"` و`"Form"."ownerId"` تحملان هذا المعرّف، وحذفُ
     الصفّ يقطع `MemberLink` معه — فيدخل صاحبه بعد ذلك بهويته المركزية
     فلا يجد مشاريعه ولا نماذجه. وهو الفقد الصامت نفسه الذي يمنعه
     `linkExistingUser`، فلا يُفتح له باب من الجهة الأخرى.

     ونقل الملكية قرارٌ لا يُتّخذ ضمنًا في زرّ حذف، فيُقال للمسؤول ما
     يمنع الحذف ويُترك القرار له. */
  const owned = await countOwnedByUser(id);
  if (owned > 0)
    return NextResponse.json(
      {
        error:
          "لا يمكن الحذف: لهذا الحساب مشاريع أو نماذج. انقل ملكيتها أولًا",
      },
      { status: 409 }
    );

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
