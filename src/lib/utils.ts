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
    default:
      return Array.isArray(value) ? value.join("، ") : String(value);
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
