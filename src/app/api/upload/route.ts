import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveFile } from "@/lib/storage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// الحد الأقصى لحجم الملف (يُطبَّق على الخادم، لا على المتصفح فقط)
const MAX_BYTES = 100 * 1024 * 1024; // 100 ميجابايت (يكفي للفيديو)
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
  if (!ALLOWED.some((re) => re.test(contentType))) {
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
