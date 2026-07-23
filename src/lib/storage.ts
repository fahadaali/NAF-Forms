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

// الرابط العام للملفات: من متغيّرات البيئة (process.env) أو من بيئة Cloudflare.
// إن لم يُضبط، تُقدَّم الملفات عبر مسار الـ Worker ‎/uploads/<key>‎.
function r2PublicBase(): string {
  let base = process.env.R2_PUBLIC_URL || "";
  if (!base) {
    try {
      const { env } = getCloudflareContext();
      base = (env as any)?.R2_PUBLIC_URL || "";
    } catch {
      /* خارج Cloudflare */
    }
  }
  return base.replace(/\/$/, "");
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
  const publicBase = r2PublicBase();

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
    return publicBase ? `${publicBase}/${key}` : `/uploads/${key}`;
  }

  // 3) تخزين محلي
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), bytes);
  return `/uploads/${key}`;
}

export interface StoredFile {
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
  size?: number;
}

// تخمين نوع المحتوى من الامتداد (للمسار المحلي)
function guessType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] || "application/octet-stream";
}

// قراءة ملف مخزَّن لتقديمه عبر الـ Worker (عندما لا يوجد رابط عام مباشر).
export async function readFile(key: string): Promise<StoredFile | null> {
  // 1) ربط R2 على Workers (بثّ مباشر بلا تحميل في الذاكرة)
  const bucket = r2Binding();
  if (bucket) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    return {
      body: obj.body as ReadableStream<Uint8Array>,
      contentType: obj.httpMetadata?.contentType || guessType(key),
      size: obj.size,
    };
  }

  // 2) R2 عبر واجهة S3 (مضيف Node)
  if (isR2Configured()) {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
      const r = await client.send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })
      );
      const bytes = await (r.Body as any).transformToByteArray();
      return {
        body: bytes as Uint8Array,
        contentType: r.ContentType || guessType(key),
      };
    } catch {
      return null;
    }
  }

  // 3) تخزين محلي
  try {
    const { readFile: fsRead } = await import("fs/promises");
    const buf = await fsRead(path.join(process.cwd(), "public", "uploads", key));
    return { body: new Uint8Array(buf), contentType: guessType(key) };
  } catch {
    return null;
  }
}
