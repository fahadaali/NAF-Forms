import { writeFile, mkdir } from "fs/promises";
import path from "path";

// طبقة تخزين بمسارين حسب البيئة:
// 1) أي مضيف مع مفاتيح R2 S3: يرفع إلى Cloudflare R2 عبر واجهة S3.
// 2) تطوير محلي: القرص في public/uploads.
// (على Cloudflare Workers يمكن استبدال هذا بربط R2 الأصلي — انظر DEPLOY.md.)

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
  const publicBase = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

  // 1) R2 عبر واجهة S3
  if (isR2Configured()) {
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
    return `${publicBase}/${key}`;
  }

  // 3) تخزين محلي
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), bytes);
  return `/uploads/${key}`;
}
