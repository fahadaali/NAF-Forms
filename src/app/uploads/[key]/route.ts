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
  const { key } = await params;
  const file = await readFile(decodeURIComponent(key));
  if (!file)
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(key)}`,
  };
  if (file.size != null) headers["Content-Length"] = String(file.size);

  return new NextResponse(file.body as any, { headers });
}
