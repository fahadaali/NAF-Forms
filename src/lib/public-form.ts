// بناء نسخة النموذج التي تُرسَل إلى المتصفّح في صفحة التعبئة العامة.
//
// **موضع واحد لا موضعان.** كانت هذه القطعة مكتوبة في `‎/f/[slug]/page.tsx`
// وحده، فلمّا صار التحقق من كلمة المرور على الخادم احتاجها `‎/api/f/[slug]/verify`
// كذلك — ونسخُها كان يعني أن أول سرّ يُضاف إلى `FormSettings` يُنزع في
// مسار ويمرّ في الآخر.
import type { FormDTO } from "./types";
import { parseSettings, safeParse } from "./utils";

/** ما يُنزع دائمًا قبل الإرسال: أسرار لا يحتاجها معبّئ النموذج. */
function publicSettings(raw: string) {
  const s = parseSettings(raw);
  // `access` فيه كلمة المرور، و`integrations` فيه رمز الواجهة ورابط Sheets،
  // و`notify` فيه بريد المشرف ورابط الـwebhook.
  return { ...s, access: {}, integrations: {}, notify: {} };
}

export interface PublicFormSource {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  status: string;
  settings: string;
  questions: {
    id: string;
    order: number;
    type: string;
    label: string;
    description: string;
    required: boolean;
    config: string;
  }[];
}

/**
 * النموذج كاملًا بلا أسرار — للنموذج المفتوح، أو للمحميّ **بعد** أن تُقبل
 * كلمة مروره على الخادم.
 */
export function toPublicForm(form: PublicFormSource): FormDTO {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    type: form.type,
    status: form.status,
    settings: publicSettings(form.settings),
    questions: form.questions.map((q) => {
      const cfg = safeParse<Record<string, any>>(q.config, {});
      // الإجابات الصحيحة والدرجات لا تُرسل للمستفيد (للاختبارات)
      const { correctAnswer, points, ...safeCfg } = cfg;
      return {
        id: q.id,
        order: q.order,
        type: q.type as FormDTO["questions"][number]["type"],
        label: q.label,
        description: q.description,
        required: q.required,
        config: safeCfg,
      };
    }),
  };
}

/**
 * النموذج المحميّ **قبل** كلمة المرور: عنوانه وحده.
 *
 * كانت البوابة في المتصفّح وحده — الأسئلة كلها في مصدر الصفحة قبل إدخال
 * أي كلمة، فتعطيلُ الجافاسكربت يكفي لقراءة نموذج «محميّ». والحماية التي
 * تُقرأ بالنظر إلى المصدر ليست حماية.
 *
 * فلا يُرسل هنا إلا ما تعرضه بوابة الإدخال نفسها: العنوان، ولون السطح.
 * ولا وصف ولا غلاف ولا روابط ولا ملفات ولا أسئلة.
 */
export function toLockedForm(form: PublicFormSource): FormDTO {
  const s = parseSettings(form.settings);
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: "",
    type: form.type,
    status: form.status,
    settings: {
      theme: s.theme,
      cover: {},
      content: { links: [], files: [] },
      afterSubmit: {},
      behavior: {},
      access: {},
      limits: {},
      notify: {},
      integrations: {},
      exam: {},
    },
    questions: [],
  };
}
