import { writeFile, mkdir } from "fs/promises";
import path from "path";

// طبقة تخزين: تستخدم Cloudflare R2 (متوافق مع S3) عند ضبط متغيّرات البيئة،
// وإلا تحفظ محليًا في public/uploads (للتطوير).
// المتغيّرات: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//            R2_BUCKET, R2_PUBLIC_URL
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

export async function saveFile(
  key: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  if (isR2Configured()) {
    // استيراد كسول حتى لا تُحمَّل الحزمة إلا عند الحاجة
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      })
    );
    const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    return `${base}/${key}`;
  }

  // تخزين محلي
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), bytes);
  return `/uploads/${key}`;
}
