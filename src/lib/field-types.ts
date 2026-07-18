// سجل أنواع الأسئلة (حقول البيانات) المدعومة في النظام.
// يُستخدم في بنّاء النموذج وفي صفحة التقديم ولوحة الردود.

export type FieldTypeId =
  | "SHORT_TEXT"
  | "PARAGRAPH"
  | "PHONE"
  | "EMAIL"
  | "NUMBER"
  | "DATE"
  | "MULTIPLE_CHOICE"
  | "CHECKBOXES"
  | "DROPDOWN"
  | "LINEAR_SCALE"
  | "GRID"
  | "RATING"
  | "LOCATION"
  | "ADDRESS"
  | "FILE"
  | "TIME"
  | "SLIDER"
  | "RANKING"
  | "IMAGE_CHOICE"
  | "SIGNATURE"
  | "SECTION";

export interface FieldTypeDef {
  id: FieldTypeId;
  label: string; // الاسم بالعربية
  hint: string; // وصف مختصر
  icon: string; // رمز تعبيري
  group: "text" | "choice" | "scale" | "special" | "layout";
  // إعدادات افتراضية عند إضافة السؤال
  defaultConfig: Record<string, unknown>;
  // هل يمكن أن يكون له إجابة صحيحة (للاختبارات)؟
  gradable: boolean;
}

export const FIELD_TYPES: FieldTypeDef[] = [
  {
    id: "SHORT_TEXT",
    label: "نص قصير",
    hint: "إجابة من سطر واحد",
    icon: "✏️",
    group: "text",
    defaultConfig: { placeholder: "" },
    gradable: true,
  },
  {
    id: "PARAGRAPH",
    label: "فقرة",
    hint: "إجابة نصية طويلة",
    icon: "📝",
    group: "text",
    defaultConfig: { placeholder: "" },
    gradable: false,
  },
  {
    id: "PHONE",
    label: "رقم جوال",
    hint: "رقم هاتف مع التحقق",
    icon: "📱",
    group: "text",
    defaultConfig: { placeholder: "05xxxxxxxx", pattern: "phone" },
    gradable: false,
  },
  {
    id: "EMAIL",
    label: "بريد إلكتروني",
    hint: "عنوان بريد إلكتروني",
    icon: "✉️",
    group: "text",
    defaultConfig: { placeholder: "name@example.com" },
    gradable: false,
  },
  {
    id: "NUMBER",
    label: "رقم",
    hint: "قيمة رقمية",
    icon: "🔢",
    group: "text",
    defaultConfig: { min: null, max: null },
    gradable: true,
  },
  {
    id: "DATE",
    label: "تاريخ",
    hint: "اختيار تاريخ",
    icon: "📅",
    group: "text",
    defaultConfig: {},
    gradable: false,
  },
  {
    id: "MULTIPLE_CHOICE",
    label: "اختيار من متعدد",
    hint: "اختيار إجابة واحدة",
    icon: "🔘",
    group: "choice",
    defaultConfig: { options: ["الخيار 1", "الخيار 2"], allowOther: false },
    gradable: true,
  },
  {
    id: "CHECKBOXES",
    label: "مربعات اختيار",
    hint: "اختيار عدة إجابات",
    icon: "☑️",
    group: "choice",
    defaultConfig: { options: ["الخيار 1", "الخيار 2"], allowOther: false },
    gradable: true,
  },
  {
    id: "DROPDOWN",
    label: "قائمة منسدلة",
    hint: "اختيار من قائمة",
    icon: "🔽",
    group: "choice",
    defaultConfig: { options: ["الخيار 1", "الخيار 2"] },
    gradable: true,
  },
  {
    id: "LINEAR_SCALE",
    label: "مقياس خطي",
    hint: "تقييم على مقياس رقمي",
    icon: "📏",
    group: "scale",
    defaultConfig: { min: 1, max: 5, minLabel: "غير موافق", maxLabel: "موافق" },
    gradable: false,
  },
  {
    id: "GRID",
    label: "تقييم شبكي",
    hint: "شبكة صفوف وأعمدة",
    icon: "▦",
    group: "scale",
    defaultConfig: {
      rows: ["العنصر 1", "العنصر 2"],
      cols: ["ضعيف", "متوسط", "ممتاز"],
      multi: false,
    },
    gradable: false,
  },
  {
    id: "RATING",
    label: "تقييم بالنجوم",
    hint: "تقييم من ٥ نجوم",
    icon: "⭐",
    group: "scale",
    defaultConfig: { max: 5, icon: "star" },
    gradable: false,
  },
  {
    id: "LOCATION",
    label: "موقع على الخريطة",
    hint: "تحديد لوكيشن على الخريطة",
    icon: "📍",
    group: "special",
    defaultConfig: { lat: 24.7136, lng: 46.6753, zoom: 5 },
    gradable: false,
  },
  {
    id: "ADDRESS",
    label: "عنوان سكن",
    hint: "حقول عنوان تفصيلية",
    icon: "🏠",
    group: "special",
    defaultConfig: {
      fields: ["المدينة", "الحي", "الشارع", "الرمز البريدي", "تفاصيل إضافية"],
    },
    gradable: false,
  },
  {
    id: "FILE",
    label: "رفع ملف",
    hint: "رفع سيرة ذاتية أو مرفق",
    icon: "📎",
    group: "special",
    defaultConfig: { accept: ".pdf,.doc,.docx,.png,.jpg", maxSizeMB: 10 },
    gradable: false,
  },
  {
    id: "TIME",
    label: "وقت",
    hint: "اختيار وقت (ساعة/دقيقة)",
    icon: "🕐",
    group: "text",
    defaultConfig: {},
    gradable: false,
  },
  {
    id: "SLIDER",
    label: "شريط تمرير",
    hint: "قيمة رقمية عبر سحب المؤشر",
    icon: "🎚️",
    group: "scale",
    defaultConfig: { min: 0, max: 100, step: 5 },
    gradable: false,
  },
  {
    id: "RANKING",
    label: "ترتيب / تفضيل",
    hint: "ترتيب الخيارات حسب الأفضلية",
    icon: "↕️",
    group: "choice",
    defaultConfig: { options: ["العنصر 1", "العنصر 2", "العنصر 3"] },
    gradable: false,
  },
  {
    id: "IMAGE_CHOICE",
    label: "اختيار بالصور",
    hint: "اختيار من بطاقات مصوّرة",
    icon: "🖼️",
    group: "choice",
    defaultConfig: {
      options: [
        { label: "خيار 1", url: "" },
        { label: "خيار 2", url: "" },
      ],
    },
    gradable: true,
  },
  {
    id: "SIGNATURE",
    label: "توقيع إلكتروني",
    hint: "رسم توقيع باليد",
    icon: "✍️",
    group: "special",
    defaultConfig: {},
    gradable: false,
  },
  {
    id: "SECTION",
    label: "عنوان / فاصل",
    hint: "عنوان أو نص توضيحي بين الأسئلة",
    icon: "➖",
    group: "layout",
    defaultConfig: {},
    gradable: false,
  },
];

export const FIELD_TYPE_MAP: Record<string, FieldTypeDef> = Object.fromEntries(
  FIELD_TYPES.map((f) => [f.id, f])
);

export const FIELD_GROUPS: { id: FieldTypeDef["group"]; label: string }[] = [
  { id: "text", label: "نصوص وأرقام" },
  { id: "choice", label: "اختيارات" },
  { id: "scale", label: "مقاييس وتقييم" },
  { id: "special", label: "حقول خاصة" },
  { id: "layout", label: "تنسيق" },
];

export function fieldType(id: string): FieldTypeDef | undefined {
  return FIELD_TYPE_MAP[id];
}

// أنواع الأسئلة التي لا تُحسب كإجابة فعلية (فواصل/عناوين)
export const NON_INPUT_TYPES: FieldTypeId[] = ["SECTION"];

export const FORM_TYPE_LABELS: Record<string, string> = {
  SURVEY: "استبيان / استطلاع",
  EXAM: "اختبار",
  JOB: "تقديم وظيفي",
};

export const FORM_STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  CLOSED: "مغلق",
};
