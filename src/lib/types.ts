import type { FieldTypeId } from "./field-types";

// إعدادات صفحة التقديم (customization) المخزّنة في Form.settings
export interface FormSettings {
  theme?: {
    primary?: string; // اللون الأساسي
    background?: string; // لون/تدرّج الخلفية
    text?: string;
    cardBg?: string;
  };
  cover?: {
    imageUrl?: string; // صورة الغلاف
    youtubeUrl?: string; // مقطع يوتيوب
    logoUrl?: string;
  };
  content?: {
    // محتوى إضافي يظهر في مقدمة النموذج: روابط/ملفات/نصوص
    links?: { label: string; url: string }[];
    files?: { name: string; url: string; downloadable: boolean }[];
    richText?: string;
  };
  afterSubmit?: {
    title?: string; // عنوان رسالة ما بعد الإرسال
    message?: string; // نص الرسالة
    showScore?: boolean; // إظهار الدرجة (للاختبارات)
    redirectUrl?: string;
  };
  behavior?: {
    oneQuestionPerCard?: boolean; // بطاقة لكل سؤال
    allowBack?: boolean; // السماح بالرجوع
    showProgress?: boolean; // شريط التقدم
    collectEmail?: boolean; // طلب بريد المستفيد قبل البدء
  };
  access?: {
    password?: string; // كلمة مرور لحماية النموذج (لا تُرسل للعميل)
    oneResponsePerEmail?: boolean; // منع تكرار التقديم بنفس البريد
  };
  limits?: {
    maxResponses?: number | null; // حد أقصى لعدد الردود
    closeAt?: string | null; // تاريخ/وقت الإغلاق التلقائي (ISO)
  };
  notify?: {
    email?: string; // بريد لاستقبال إشعار عند وصول رد جديد
    webhookUrl?: string; // إرسال بيانات الرد إلى رابط خارجي (Webhook)
    confirmToRespondent?: boolean; // إرسال رسالة تأكيد للمستفيد
    confirmSubject?: string;
    confirmMessage?: string;
  };
  exam?: {
    timeLimitMin?: number | null; // مدة الاختبار بالدقائق
    shuffle?: boolean; // خلط ترتيب الأسئلة
    showAnswers?: boolean; // إظهار الإجابات الصحيحة بعد التسليم
    passScore?: number | null; // درجة النجاح
  };
}

// قاعدة منطق شرطي على مستوى السؤال (تُخزَّن في config.logic)
export interface QuestionLogic {
  whenQuestionId: string;
  operator: "eq" | "neq" | "contains";
  value: string;
}

export interface QuestionDTO {
  id: string;
  order: number;
  type: FieldTypeId;
  label: string;
  description: string;
  required: boolean;
  config: Record<string, any>;
}

export interface FormDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  status: string;
  settings: FormSettings;
  questions: QuestionDTO[];
}

export const DEFAULT_SETTINGS: FormSettings = {
  theme: {
    primary: "#1c59f5",
    background: "#f1f5ff",
    text: "#0f172a",
    cardBg: "#ffffff",
  },
  cover: {},
  content: { links: [], files: [] },
  afterSubmit: {
    title: "تم استلام ردك بنجاح 🎉",
    message: "شكرًا لك على وقتك. تم تسجيل إجابتك.",
    showScore: false,
  },
  behavior: {
    oneQuestionPerCard: true,
    allowBack: true,
    showProgress: true,
    collectEmail: false,
  },
  access: {},
  limits: { maxResponses: null, closeAt: null },
  notify: {},
  exam: { timeLimitMin: null, shuffle: false, showAnswers: false, passScore: null },
};
