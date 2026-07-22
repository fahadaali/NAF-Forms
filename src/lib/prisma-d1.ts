// عميل Prisma فوق Cloudflare D1 (يُستخدم عند التشغيل على Workers).
// في بيئة Workers لا يوجد singleton؛ يُنشأ عميل لكل طلب باستخدام ربط D1.
//
// مثال الاستخدام داخل مسار يعمل على Workers:
//   import { getCloudflareContext } from "@opennextjs/cloudflare";
//   import { prismaFromD1 } from "@/lib/prisma-d1";
//   const { env } = getCloudflareContext();
//   const prisma = prismaFromD1(env.DB);
//
// ملاحظة: للتطوير المحلي (Node) استمر في استخدام "@/lib/prisma" المعتاد.
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

export function prismaFromD1(d1: any): PrismaClient {
  const adapter = new PrismaD1(d1);
  return new PrismaClient({ adapter });
}
