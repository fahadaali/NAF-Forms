import { NextResponse } from "next/server";
import { ensureProject, createForm } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";
import { NAF_MUTED_FOREGROUND } from "@/lib/brand";
import { parseSettings } from "@/lib/utils";

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

  /* ═══ القالب مشترك، فلا يحمل سرًّا ═══

     القوالب تُعرض للجميع وتُنسَخ من الجميع، و`settings` تحمل كلمة مرور
     النموذج وبريد الإشعار ورابط الـwebhook ورمز الواجهة البرمجية. فحفظُ
     نموذج محميّ كقالب كان ينشر مفاتيحه على كل من ينسخ القالب.

     والمنزوع هنا هو المنزوع نفسه في `‎/f/[slug]` قبل الإرسال إلى المتصفّح:
     `access` و`integrations` و`notify`. والتخصيص والسلوك وإعداد الاختبار
     تبقى، فهي ما يُنسخ لأجله القالب. */
  const shared = parseSettings(src.settings);
  const safeSettings = JSON.stringify({
    ...shared,
    access: {},
    integrations: {},
    notify: {},
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
      settings: safeSettings,
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
