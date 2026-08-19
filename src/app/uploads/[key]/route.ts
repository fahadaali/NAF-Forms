import { NextResponse } from "next/server";
import { readFile } from "@/lib/storage";

export const runtime = "nodejs";

// تقديم الملفات المخزّنة في R2 عبر الـ Worker مباشرة.
// يعمل هذا المسار عندما لا يُضبط رابط عام (R2_PUBLIC_URL)؛ فتظل روابط
// «/uploads/<key>» صالحة للعرض والتنزيل على كلاودفلير والبيئة المحلية.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  /* المعرّف يصل مفكوك الترميز من Next، فلا يُفكّ ثانيةً.
     كان `decodeURIComponent(key)` فكًّا ثانيًا: `%252e%252e%252f` تصير
     `../`. على R2 بحثُ مفتاح لا يضرّ، وفي مسار Node المحلي تصل
     `path.join` فتخرج من مجلّد الرفع. */
  const { key } = await params;

  // وحارسٌ صريح فوق ذلك: مفتاح الرفع `nanoid(10)-اسم-منقّى`، فلا فاصل مسار
  // فيه ولا نقطتان. وهذا يبقى صحيحًا مهما تغيّر ما قبله.
  if (!key || key.includes("/") || key.includes("\\") || key.includes("..")) {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  }

  const file = await readFile(key);
  if (!file)
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  /* ═══ `attachment` لا `inline`، و`nosniff` معها ═══

     المرفقات يرفعها من لا حساب له من صفحة تعبئة عامة، وتُقدَّم من أصل
     المنصة نفسه. فملفٌ يُعرض `inline` هو مستندٌ يعمل في أصلنا: SVG بسكربت
     كان يكفي، وقد مُنع في الرفع اليوم — لكن ما رُفع قبل اليوم باقٍ في
     الحاوية، وهذا السطر يُبطله.

     و`nosniff` تمنع المتصفّح من تخمين نوعٍ أخطر من المعلن.

     والثمن أن الصورة تُنزَّل بدل أن تُعرض في تبويب — وهو ثمنٌ مقبول لملفات
     يرفعها مجهول. */
  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": "private, max-age=31536000, immutable",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(key)}`,
  };
  if (file.size != null) headers["Content-Length"] = String(file.size);

  return new NextResponse(file.body as any, { headers });
}
