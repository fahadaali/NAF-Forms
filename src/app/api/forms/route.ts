import { NextResponse } from "next/server";
import { getFormWithQuestions, createForm } from "@/lib/repo";
import { authorizeProject, canAccessOwned } from "@/lib/session";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";

// إنشاء نموذج جديد: فارغ أو من قالب جاهز
export async function POST(req: Request) {
  const body = await req.json();
  const projectId: string = body.projectId;
  if (!projectId)
    return NextResponse.json({ error: "projectId مطلوب" }, { status: 400 });

  // لا يُنشأ نموذج إلا داخل مشروع يملكه المستخدم (أو للمسؤول)
  const auth = await authorizeProject(projectId);
  if (!auth)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  const ownerId = auth.session.uid;

  const title = body.title?.trim() || "نموذج بدون عنوان";
  const slug = `${slugify(title)}-${nanoid(6)}`;

  /* ═══ المصدر يُحرَس كما تُحرَس الوجهة ═══

     كان `templateId` يُقرأ بلا فحص: لا أنه قالب، ولا أنه ملك المستدعي.
     فتمريرُ **معرّف نموذج عضوٍ آخر** كان يعطي نسخةً كاملة يملكها المرسِل —
     الأسئلة بـ`correctAnswer` و`points`، و`settings` بكاملها وفيها كلمة
     مرور النموذج ورابط الـwebhook ورمز الواجهة البرمجية.

     والتصريح كان يقع على `projectId` وحده — أي على **الوجهة**. والنسخ
     يقرأ من مصدر، والمصدر بلا حارس نسخٌ مفتوح.

     فالمقبول اثنان لا ثالث: قالبٌ مشترك (`isTemplate`)، أو نموذجٌ يصل
     إليه المستدعي أصلًا. */
  if (body.templateId) {
    const tpl = await getFormWithQuestions(body.templateId);
    if (!tpl)
      return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
    if (!tpl.isTemplate && !canAccessOwned(auth.session, tpl.ownerId))
      return NextResponse.json(
        { error: "لا تملك صلاحية الوصول" },
        { status: 403 }
      );
    const form = await createForm(
      {
        slug,
        projectId,
        title: body.title?.trim() || tpl.title,
        description: tpl.description,
        type: tpl.type,
        status: "DRAFT",
        settings: tpl.settings,
        ownerId,
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
    ownerId,
  });
  return NextResponse.json(form);
}
