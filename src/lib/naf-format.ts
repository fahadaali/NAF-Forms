/* ============================================================
   دوال التنسيق المشتركة لمنصات ناف.
   لا تنسّق رقماً ولا تاريخاً ولا مبلغاً في مكوّن. من هنا حصراً.

   القواعد المعتمدة:
   - أرقام غربية دائماً
   - فاصل الآلاف بالفاصلة
   - المبالغ بخانتين عشريتين دائماً
   - الوقت بنظام ٢٤ ساعة
   - التاريخ الميلادي: 2026/07/26
   - التاريخ الهجري: 1448/02/11 هـ
   ============================================================ */

const AMOUNT_FORMAT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

/* ═══ المنطقة الزمنية ثابتة، لا منطقة البيئة ═══

   كانت الدوال تبني التاريخ من `getFullYear/getMonth/getHours` — أي بمنطقة
   ما يُنفَّذ فيه الكود. وذلك يعطي ثلاثة أجوبة لسؤال واحد:

     - على Workers منطقة الخادم UTC، فكل تاريخ يُصيَّر على الخادم متأخّر
       ثلاث ساعات عن التوقيت السعودي — ومنصةُ نماذج تسجّل مواعيد تقديم،
       وثلاث ساعات تنقل رداً من ليلة إلى ليلة.
     - في مكوّن عميل منطقةُ متصفّح القارئ، فتُعرض في الشاشة الواحدة قيمتان
       بمرجعين مختلفين (لوحة الردود مقابل ملف التصدير).
     - وبين الخادم والمتصفّح اختلافُ ترطيب في كل تاريخ يُصيَّر مرتين.

   فالمرجع واحد مصرَّح به: توقيت الرياض. ولا يتبع صيفاً ولا شتاءً
   (UTC+3 ثابتاً)، لكنّ `Intl` أدقّ من إزاحةٍ مكتوبة باليد وتبقى صحيحة لو
   تغيّرت القاعدة يوماً.

   ويُقرأ من `NAF_TIMEZONE` عند الحاجة إلى منصة بمنطقة أخرى. */
const TIME_ZONE =
  (typeof process !== "undefined" && process.env?.NAF_TIMEZONE) || "Asia/Riyadh"

const HIJRI_FORMAT = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
})

// أجزاء التاريخ والوقت في المنطقة المعتمدة — مصدر كل الدوال أدناه.
const PARTS_FORMAT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
})

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

interface Parts {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function parts(value: Date | string | number): Parts {
  const found = PARTS_FORMAT.formatToParts(toDate(value))
  const get = (type: string) => found.find((p) => p.type === type)?.value ?? ""
  // ‏`hour12: false` يعطي "24" عند منتصف الليل في بعض المحرّكات
  const hour = get("hour") === "24" ? "00" : get("hour")
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
  }
}

/**
 * يعزل قيمة اتجاهياً داخل نص عربي.
 *
 * للسلاسل الخام التي لا يصلح فيها <bdi>: رسائل confirm ونصوص الحالة
 * والتنبيهات. في JSX استعمل <bdi> لا هذه.
 *
 * المحرفان U+2068 (عزل أول) و U+2069 (إنهاء العزل).
 *
 * القاعدة توجب عزل كل رقم وتاريخ ومبلغ، و<bdi> يغطّي JSX وحده — فبدون
 * هذه الدالة تبقى كل رسالة فيها رقم منحرفة.
 *
 * @example
 *   setMsg(`تم حذف ${isolate(count)} عنصراً`)
 *   confirm(`حذف ${isolate(n)} عنصراً نهائياً؟`)
 */
export function isolate(value: string | number): string {
  return `\u2068${value}\u2069`
}

/** المبلغ بلا رمز العملة: 12400 -> "12,400.00" */
export function formatAmount(value: number): string {
  return AMOUNT_FORMAT.format(value)
}

/** عدد صحيح بفاصل آلاف: 12400 -> "12,400" */
export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value)
}

/** ميلادي: "2026/07/26" */
export function formatDate(value: Date | string | number): string {
  const p = parts(value)
  return `${p.year}/${p.month}/${p.day}`
}

/** هجري أم القرى: "1448/02/11 هـ" */
export function formatHijriDate(value: Date | string | number): string {
  const parts = HIJRI_FORMAT.formatToParts(toDate(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}/${get("month")}/${get("day")} هـ`
}

/** المزدوج: الميلادي أولاً ثم الهجري بين قوسين */
export function formatDualDate(value: Date | string | number): string {
  return `${formatDate(value)} (${formatHijriDate(value)})`
}

/**
 * الشهر والسنة لعناوين التقويم ومنتقي التاريخ: "2026/07".
 *
 * مشتقّة من الصيغة الميلادية المعتمدة بحذف اليوم — ليست صيغة جديدة.
 * أسماء الأشهر العربية ليست صيغة معتمدة لعرض قيمة تاريخ.
 */
export function formatMonth(value: Date | string | number): string {
  const p = parts(value)
  return `${p.year}/${p.month}`
}

/** نظام ٢٤ ساعة: "14:30" */
export function formatTime(value: Date | string | number): string {
  const p = parts(value)
  return `${p.hour}:${p.minute}`
}

/** الجوال السعودي: "+966 5X XXX XXXX" */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^00966|^966|^0/, "")
  if (digits.length !== 9) return value
  return `+966 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
}

/** الميلادي مع الوقت: "2026/07/26 14:30" */
export function formatDateTime(value: Date | string | number): string {
  return `${formatDate(value)} ${formatTime(value)}`
}
