import { PrismaClient } from "@prisma/client";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// يختار العميل تلقائيًا:
// - على Cloudflare Workers: Prisma فوق ربط D1 (env.DB).
// - محليًا (Node): عميل SQLite مفرد.
// عبر وكيل (Proxy) حتى لا تتغيّر مواضع الاستدعاء في التطبيق.

const g = globalThis as unknown as {
  __nafPrismaNode?: PrismaClient;
  __nafPrismaD1?: PrismaClient;
};

function nodeClient(): PrismaClient {
  if (!g.__nafPrismaNode)
    g.__nafPrismaNode = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  return g.__nafPrismaNode;
}

function resolveClient(): PrismaClient {
  try {
    const { env } = getCloudflareContext();
    const DB = (env as any)?.DB;
    if (DB) {
      if (!g.__nafPrismaD1) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaD1 } = require("@prisma/adapter-d1");
        g.__nafPrismaD1 = new PrismaClient({ adapter: new PrismaD1(DB) });
      }
      return g.__nafPrismaD1;
    }
  } catch {
    // خارج بيئة Workers: نسقط إلى العميل المحلي
  }
  return nodeClient();
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = resolveClient() as any;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
