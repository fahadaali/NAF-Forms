import { DEFAULT_SETTINGS, type FormSettings } from "./types";
import { NON_INPUT_TYPES, type FieldTypeId } from "./field-types";

export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseSettings(raw: string | null | undefined): FormSettings {
  const parsed = safeParse<FormSettings>(raw, {});
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    theme: { ...DEFAULT_SETTINGS.theme, ...parsed.theme },
    cover: { ...DEFAULT_SETTINGS.cover, ...parsed.cover },
    content: { ...DEFAULT_SETTINGS.content, ...parsed.content },
    afterSubmit: { ...DEFAULT_SETTINGS.afterSubmit, ...parsed.afterSubmit },
    behavior: { ...DEFAULT_SETTINGS.behavior, ...parsed.behavior },
    access: { ...DEFAULT_SETTINGS.access, ...parsed.access },
    limits: { ...DEFAULT_SETTINGS.limits, ...parsed.limits },
    notify: { ...DEFAULT_SETTINGS.notify, ...parsed.notify },
    exam: { ...DEFAULT_SETTINGS.exam, ...parsed.exam },
  };
}

// تقييم المنطق الشرطي للسؤال: هل يظهر السؤال بناءً على إجابة سابقة؟
export function isVisibleByLogic(
  config: Record<string, any> | undefined,
  answers: Record<string, any>
): boolean {
  const logic = config?.logic;
  if (!logic || !logic.whenQuestionId) return true;
  const src = answers[logic.whenQuestionId];
  const target = String(logic.value ?? "");
  const asArray = Array.isArray(src) ? src.map(String) : [String(src ?? "")];
  switch (logic.operator) {
    case "eq":
      return String(src ?? "") === target;
    case "neq":
      return String(src ?? "") !== target;
    case "contains":
      return asArray.includes(target);
    default:
      return true;
  }
}

// تحويل رابط يوتيوب إلى رابط تضمين
export function youtubeEmbed(url?: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function isInputQuestion(type: string): boolean {
  return !NON_INPUT_TYPES.includes(type as FieldTypeId);
}

const AR_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return AR_DATE.format(date);
}

// تمثيل الإجابة كنص لأغراض العرض/التصدير
export function answerToText(type: string, value: any): string {
  if (value === null || value === undefined || value === "") return "";
  switch (type) {
    case "CHECKBOXES":
      return Array.isArray(value) ? value.join("، ") : String(value);
    case "LOCATION":
      if (value && typeof value === "object" && "lat" in value)
        return `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`;
      return String(value);
    case "ADDRESS":
      if (value && typeof value === "object")
        return Object.values(value).filter(Boolean).join("، ");
      return String(value);
    case "GRID":
      if (value && typeof value === "object")
        return Object.entries(value)
          .map(([r, c]) => `${r}: ${Array.isArray(c) ? c.join("/") : c}`)
          .join(" | ");
      return String(value);
    case "RATING":
      return `${value} / 5`;
    case "RANKING":
      return Array.isArray(value)
        ? value.map((v, i) => `${i + 1}. ${v}`).join("، ")
        : String(value);
    case "SIGNATURE":
      return value ? "[توقيع]" : "";
    case "CONSENT":
      return value === true || value === "true" ? "موافق" : "غير موافق";
    default:
      return Array.isArray(value) ? value.join("، ") : String(value);
  }
}

// هل القيمة فارغة (لا إجابة)؟
export function isEmptyAnswer(value: any): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === false ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  );
}

// نمط رقم الجوال (سعودي 05xxxxxxxx أو دولي +…)
const PHONE_RE = /^(?:\+?\d{7,15}|0\d{9})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// التحقق من صحة قيمة الحقل حسب نوعه، وإرجاع رسالة الخطأ أو null إن كانت صحيحة.
// يُستخدم في صفحة التعبئة (قبل الانتقال) وفي الخادم (قبل القبول).
export function validateAnswer(
  type: string,
  config: Record<string, any>,
  value: any,
  required: boolean
): string | null {
  const empty = isEmptyAnswer(value);
  if (empty) {
    if (type === "CONSENT" && required) return "يجب الموافقة للمتابعة";
    return required ? "هذا الحقل إلزامي" : null;
  }
  switch (type) {
    case "NUMBER": {
      const raw = String(value).trim();
      const n = Number(raw);
      if (raw === "" || Number.isNaN(n))
        return "هذه القيمة ليست رقمًا صحيحًا";
      if (config?.min != null && config.min !== "" && n < Number(config.min))
        return `القيمة يجب ألا تقل عن ${config.min}`;
      if (config?.max != null && config.max !== "" && n > Number(config.max))
        return `القيمة يجب ألا تزيد عن ${config.max}`;
      return null;
    }
    case "EMAIL":
      return EMAIL_RE.test(String(value).trim())
        ? null
        : "البريد الإلكتروني غير صالح (مثال: name@example.com)";
    case "PHONE": {
      const digits = String(value).replace(/[\s()-]/g, "");
      return PHONE_RE.test(digits)
        ? null
        : "رقم الجوال غير صالح (مثال: 05xxxxxxxx)";
    }
    case "CONSENT":
      return value === true || !required ? null : "يجب الموافقة للمتابعة";
    default:
      return null;
  }
}

// حساب درجة الاختبار
export function gradeAnswer(
  type: string,
  config: Record<string, any>,
  value: any
): { correct: boolean; points: number } {
  const points = Number(config?.points ?? 1);
  const correct = config?.correctAnswer;
  if (correct === undefined || correct === null || correct === "")
    return { correct: false, points: 0 };
  let isCorrect = false;
  if (type === "CHECKBOXES" && Array.isArray(correct) && Array.isArray(value)) {
    isCorrect =
      correct.length === value.length &&
      correct.every((c) => value.includes(c));
  } else {
    isCorrect = String(value).trim() === String(correct).trim();
  }
  return { correct: isCorrect, points: isCorrect ? points : 0 };
}

// روابط ASCII فقط لتفادي مشاكل الترميز في المسارات والترويسات.
// إن كان العنوان عربيًا بالكامل يُعتمد على المُعرّف العشوائي وحده.
export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "form";
}
