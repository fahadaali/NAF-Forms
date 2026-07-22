import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";

// رفع الملفات (السير الذاتية والمرفقات) عبر طبقة التخزين (R2 أو محلي)
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.؀-ۿ-]+/g, "_");
  const key = `${nanoid(10)}-${safeName}`;
  const url = await saveFile(key, bytes, file.type || "application/octet-stream");
  return NextResponse.json({ url, name: file.name });
}
