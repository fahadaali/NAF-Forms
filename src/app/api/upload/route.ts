import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

// رفع الملفات (السير الذاتية والمرفقات) إلى مجلد public/uploads
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safeName = file.name.replace(/[^\w.؀-ۿ-]+/g, "_");
  const filename = `${nanoid(10)}-${safeName}`;
  await writeFile(path.join(dir, filename), bytes);
  return NextResponse.json({ url: `/uploads/${filename}`, name: file.name });
}
