import { DEFAULT_SETTINGS, type FormSettings } from "./types";
import { formatDate, formatTime } from "./naf-format";
import {
  NON_INPUT_TYPES,
  HIDDEN_FIELD_TYPES,
  type FieldTypeId,
} from "./field-types";

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

// يحسب العناصر الظاهرة مع وراثة شرط القسم:
// يظهر العنصر إذا تحقّق شرطه الخاص وشرط القسم (أقرب SECTION قبله).
// هكذا يمكن إظهار/تخطّي قسم كامل بناءً على إجابة سابقة (انتقال شرطي)،
// أو ترتيب الأقسام بلا شرط (انتقال بدون شرط).
export function computeVisibleQuestions<
  T extends { type: string; config: any }
>(questions: T[], answers: Record<string, any>): T[] {
  let sectionVisible = true;
  const out: T[] = [];
  for (const q of questions) {
    const cfg =
      typeof q.config === "string" ? safeParse<Record<string, any>>(q.config, {}) : q.config || {};
    if (q.type === "SECTION") {
      sectionVisible = isVisibleByLogic(cfg, answers);
      if (sectionVisible) out.push(q);
      continue;
    }
    if (sectionVisible && isVisibleByLogic(cfg, answers)) out.push(q);
  }
  return out;
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

// حقل يُسجَّل دون عرضه في صفحة التعبئة
export function isHiddenField(type: string): boolean {
  return HIDDEN_FIELD_TYPES.includes(type as FieldTypeId);
}

/**
 * التاريخ والوقت من مكتبة التنسيق المشتركة `naf-format` في السجلّ.
 * لا تنسيق داخلي: القاعدة ٨ تُلزم بأن يمرّ كل رقم وتاريخ من هناك.
 *
 * الصيغة السابقة كانت `ar-SA-u-ca-gregory` بـ dateStyle/timeStyle، فأنتجت
 * أرقامًا عربية-هندية (٢٠٢٦/٠٧/٢٦) ونظام ١٢ ساعة بعلامة ص/م — وكلاهما
 * مخالف لـ naf-terms §٥.
 */
export function formatDateTime(d: Date | string): string {
  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * عزل ثنائي الاتجاه لقيمة داخل نص عربي — مكافئ `<bdi>` في النصوص الصِرفة.
 *
 * القاعدة ٢ تُلزم بعزل كل رقم وتاريخ واسم ملف ومقطع لاتيني داخل نص عربي.
 * في JSX نستخدم `<bdi>`، لكن بعض النصوص تُبنى كسلاسل (رسائل خطأ، قيم تُمرَّر
 * كـ prop) فلا تقبل عنصرًا. هنا نستخدم محرفَي العزل من Unicode نفسهما اللذين
 * يستخدمهما `<bdi>` داخليًا: FSI (U+2068) و PDI (U+2069).
 *
 * غير مرئيين، ولا يظهران في النسخ ولا في التصدير كنصّ مقروء.
 */
export function bidi(v: string | number): string {
  return `⁨${v}⁩`;
}

// تمثيل الإجابة كنص لأغراض العرض/التصدير
export function answerToText(
  type: string,
  value: any,
  config?: Record<string, any>
): string {
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
      // عدد النجوم قابل للتخصيص، فلا نفترض 5 دائمًا
      return `${value} / ${Number(config?.max ?? 5)}`;
    case "RANKING":
      return Array.isArray(value)
        ? value.map((v, i) => `${i + 1}. ${v}`).join("، ")
        : String(value);
    case "SIGNATURE":
      return value ? "[توقيع]" : "";
    case "CONSENT":
      return value === true || value === "true" ? "موافق" : "غير موافق";
    case "FILE":
      // ملف واحد أو عدة ملفات
      if (Array.isArray(value))
        return value.map((f: any) => f?.name || "ملف").join("، ");
      if (value && typeof value === "object") return value.name || "ملف";
      return String(value);
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

/** خيارات السؤال كنصوص — `IMAGE_CHOICE` يخزّنها كائنات بعنوان ورابط. */
export function optionsOf(type: string, config: Record<string, any>): string[] {
  const raw = Array.isArray(config?.options) ? config.options : [];
  if (type === "IMAGE_CHOICE")
    return raw.map((o: any) => String(o?.label ?? "")).filter(Boolean);
  return raw.map((o: any) => String(o ?? "")).filter(Boolean);
}

// أنواع تُقيَّد قيمتها بقائمة خيارات معرَّفة
const CHOICE_TYPES = ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "IMAGE_CHOICE"];

// التحقق من صحة قيمة الحقل حسب نوعه، وإرجاع رسالة الخطأ أو null إن كانت صحيحة.
// يُستخدم في صفحة التعبئة (قبل الانتقال) وفي الخادم (قبل القبول).
//
// **والخادم يتحقّق مما كان يتحقّق منه المتصفّح وحده.** كانت هذه الدالة تفحص
// أربعة أنواع، فمن أرسل الطلب مباشرةً كتب في «القائمة المنسدلة» ما شاء،
// وتجاوز حدود المقياس، وأرسل نصًّا بلا حدّ طول. وأثره العملي على الحصص:
// خيارٌ خارج القائمة لا حصّة له فيمرّ دائمًا.
export function validateAnswer(
  type: string,
  config: Record<string, any>,
  value: any,
  required: boolean
): string | null {
  const empty = isEmptyAnswer(value);
  if (empty) {
    if (type === "CONSENT" && required) return "يجب الموافقة للمتابعة";
    return required ? "هذا الحقل مطلوب" : null;
  }

  // القيمة من قائمة الخيارات المعرَّفة — لكل نوع اختيار
  if (CHOICE_TYPES.includes(type)) {
    const allowed = optionsOf(type, config);
    if (allowed.length) {
      const picked = Array.isArray(value) ? value : [value];
      const multi = type === "CHECKBOXES";
      if (!multi && picked.length > 1) return "اختر خيارًا واحدًا";
      for (const v of picked) {
        const str = String(v ?? "");
        // «خيار آخر» يُقبل نصًّا حرًّا حين يُفعّله صاحب النموذج
        if (allowed.includes(str)) continue;
        if (config?.allowOther && str.length <= 500) continue;
        return "هذا الخيار غير متاح";
      }
      const max = Number(config?.maxSelect ?? 0);
      if (multi && max > 0 && picked.length > max)
        return `اختر ${bidi(max)} خيارات على الأكثر`;
    }
    return null;
  }

  switch (type) {
    case "SHORT_TEXT":
    case "PARAGRAPH": {
      const max = Number(config?.maxLength ?? 0);
      const len = String(value).length;
      if (max > 0 && len > max)
        return `الحد الأقصى ${bidi(max)} حرفًا`;
      // سقف مطلق يمنع تخزين حمولة ضخمة في إجابة نصّية
      if (len > 20_000) return `الحد الأقصى ${bidi(20000)} حرفًا`;
      return null;
    }
    case "NUMBER": {
      const raw = String(value).trim();
      const n = Number(raw);
      if (raw === "" || Number.isNaN(n))
        return "هذه القيمة ليست رقمًا صحيحًا";
      if (config?.min != null && config.min !== "" && n < Number(config.min))
        return `القيمة يجب ألا تقل عن ${bidi(config.min)}`;
      if (config?.max != null && config.max !== "" && n > Number(config.max))
        return `القيمة يجب ألا تزيد عن ${bidi(config.max)}`;
      return null;
    }
    case "LINEAR_SCALE":
    case "SLIDER": {
      const n = Number(value);
      const min = Number(config?.min ?? (type === "SLIDER" ? 0 : 1));
      const max = Number(config?.max ?? (type === "SLIDER" ? 100 : 5));
      if (!Number.isFinite(n) || n < min || n > max)
        return `القيمة يجب أن تكون بين ${bidi(min)} و${bidi(max)}`;
      return null;
    }
    case "RATING": {
      const n = Number(value);
      const max = Number(config?.max ?? 5);
      if (!Number.isFinite(n) || n < 0 || n > max)
        return `القيمة يجب أن تكون بين ${bidi(0)} و${bidi(max)}`;
      return null;
    }
    case "GRID": {
      if (typeof value !== "object" || Array.isArray(value))
        return "هذا الحقل مطلوب";
      const rows: string[] = (config?.rows || []).map(String);
      const cols: string[] = (config?.cols || []).map(String);
      for (const [row, cell] of Object.entries(value as Record<string, any>)) {
        if (rows.length && !rows.includes(row)) return "هذا الخيار غير متاح";
        const chosen = Array.isArray(cell) ? cell : [cell];
        if (!config?.multi && chosen.length > 1) return "اختر خيارًا واحدًا";
        for (const c of chosen)
          if (cols.length && !cols.includes(String(c)))
            return "هذا الخيار غير متاح";
      }
      return null;
    }
    case "RANKING": {
      if (!Array.isArray(value)) return "هذا الخيار غير متاح";
      const allowed = optionsOf(type, config);
      if (allowed.length) {
        const seen = new Set<string>();
        for (const v of value) {
          const str = String(v ?? "");
          if (!allowed.includes(str) || seen.has(str))
            return "هذا الخيار غير متاح";
          seen.add(str);
        }
      }
      return null;
    }
    case "EMAIL":
      return EMAIL_RE.test(String(value).trim())
        ? null
        : "أدخل بريدًا إلكترونيًا صحيحًا";
    case "PHONE": {
      const digits = String(value).replace(/[\s()-]/g, "");
      return PHONE_RE.test(digits)
        ? null
        : "أدخل رقم جوال صحيحًا (مثال: 05xxxxxxxx)";
    }
    case "DATE":
      return Number.isNaN(new Date(String(value)).getTime())
        ? "هذه القيمة ليست تاريخًا صحيحًا"
        : null;
    case "TIME":
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))
        ? null
        : "هذه القيمة ليست وقتًا صحيحًا";
    case "LOCATION": {
      const v: any = value;
      const okLoc =
        v && typeof v === "object" &&
        Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng)) &&
        Math.abs(Number(v.lat)) <= 90 && Math.abs(Number(v.lng)) <= 180;
      return okLoc ? null : "حدّد موقعًا على الخريطة";
    }
    case "CONSENT":
      return value === true || !required ? null : "يجب الموافقة للمتابعة";
    default:
      return null;
  }
}

/**
 * مرفقات الإجابة — **روابطها من تخزين هذه المنصة وحده**.
 *
 * كانت قيمة حقل الملف تُخزَّن كما وصلت، فمن أرسل الطلب مباشرةً كتب
 * `{ name: "السيرة الذاتية.pdf", url: "https://…" }` لأي عنوان شاء —
 * فتعرضه لوحة الردود رابطًا يفتحه المشرف على أنه مرفق المتقدّم.
 *
 * والمقبول ما يُصدره `‎/api/upload` وحده: مسار `‎/uploads/<key>` النسبي،
 * أو رابط تحت `R2_PUBLIC_URL` حين يُضبط.
 */
export function isOwnUploadUrl(url: unknown, publicBase = ""): boolean {
  const s = String(url ?? "");
  if (!s) return false;
  if (s.startsWith("/uploads/")) return !s.includes("..");
  if (!publicBase) return false;
  const base = publicBase.replace(/\/$/, "");
  return s.startsWith(`${base}/`) && !s.includes("..");
}

/** ينقّي قيمة حقل الملف: يُبقي المرفقات التي تشير إلى تخزيننا. */
export function sanitizeFileAnswer(value: any, publicBase = ""): any {
  const one = (f: any) =>
    f && typeof f === "object" && isOwnUploadUrl(f.url, publicBase)
      ? { name: String(f.name ?? "ملف").slice(0, 300), url: String(f.url), size: Number(f.size) || 0 }
      : null;
  if (Array.isArray(value)) return value.map(one).filter(Boolean);
  return one(value);
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
