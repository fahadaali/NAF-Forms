import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// طبقة تخزين بثلاثة مسارات حسب البيئة:
// 1) Cloudflare Workers: ربط R2 الأصلي (env.BUCKET).
// 2) أي مضيف Node مع مفاتيح R2 S3: عبر واجهة S3.
// 3) تطوير محلي: القرص في public/uploads.

function r2Binding(): any | null {
  try {
    const { env } = getCloudflareContext();
    return (env as any)?.BUCKET ?? null;
  } catch {
    return null;
  }
}

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

  // 1) ربط R2 على Workers
  const bucket = r2Binding();
  if (bucket) {
    await bucket.put(key, bytes, { httpMetadata: { contentType } });
    return publicBase ? `${publicBase}/${key}` : `/uploads/${key}`;
  }

  // 2) R2 عبر واجهة S3 (مضيف Node)
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
