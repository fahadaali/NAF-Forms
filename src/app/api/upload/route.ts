import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveFile } from "@/lib/storage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// الحد الأقصى لحجم الملف (يُطبَّق على الخادم، لا على المتصفح فقط)
const MAX_BYTES = 100 * 1024 * 1024; // 100 ميجابايت (يكفي للفيديو)

/* ═══ SVG ممنوع، وليس صورةً في هذا السياق ═══

   `‎/^image\//‎` كانت تقبل `image/svg+xml`. وSVG مستندٌ يحمل سكربتًا، لا
   صورة: يُرفع من صفحة تعبئة عامة بلا حساب، ويُقدَّم من `‎/uploads/<key>`
   على أصل المنصة نفسه — فيصير سكربتًا يعمل في جلسة المشرف حين يفتح ما
   يظنّه سيرةً ذاتية.

   والمنع هنا لا يُغني عن `nosniff` و`attachment` في مسار التقديم؛ الطبقتان
   معًا: هذه تمنع الدخول، وتلك تمنع التنفيذ لما دخل قبل اليوم. */
const BLOCKED = [/^image\/svg/, /^text\/html/, /^application\/xhtml/];

// أنواع المحتوى المسموح بها: صور، فيديو، صوت، ومستندات شائعة
const ALLOWED = [
  /^image\//,
  /^video\//,
  /^audio\//,
  /^application\/pdf$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-officedocument\./,
  /^application\/vnd\.ms-(excel|powerpoint)$/,
  /^text\/plain$/,
];

// الامتداد يُفحص كذلك: `file.type` يكتبه المتصفّح ويمكن انتحاله، فملفٌ
// اسمه `x.svg` بنوع `image/png` كان يمرّ ثم يُقدَّم بـ`image/svg+xml`
// لأن `guessType` تشتقّ من الامتداد.
const BLOCKED_EXT = /\.(svgz?|html?|xht(ml)?|xml|js|mjs|mhtml?)$/i;

// رفع الملفات (السير الذاتية والمرفقات) عبر طبقة التخزين (R2 أو محلي).
// المسار عام لأن معبّئ النموذج غير مسجّل الدخول؛ لذا نطبّق حدًّا للمعدّل
// وسقفًا للحجم وقائمة أنواع مسموحة لمنع إساءة الاستخدام.
export async function POST(req: Request) {
  if (!rateLimit(`upload:${clientIp(req)}`, 20, 60_000))
    return NextResponse.json(
      { error: "محاولات رفع كثيرة، حاول لاحقًا" },
      { status: 429 }
    );

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `حجم الملف يتجاوز الحد الأقصى (${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 413 }
    );
  }
  const contentType = file.type || "application/octet-stream";
  if (
    BLOCKED.some((re) => re.test(contentType)) ||
    BLOCKED_EXT.test(file.name) ||
    !ALLOWED.some((re) => re.test(contentType))
  ) {
    return NextResponse.json(
      { error: "نوع الملف غير مسموح" },
      { status: 415 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.؀-ۿ-]+/g, "_");
  const key = `${nanoid(10)}-${safeName}`;
  const url = await saveFile(key, bytes, contentType);
  return NextResponse.json({ url, name: file.name });
}
