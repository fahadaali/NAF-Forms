import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// يختار العميل تلقائيًا:
// - على Cloudflare Workers: Prisma فوق ربط D1 (env.DB).
// - محليًا (Node): عميل SQLite مفرد.
// عبر وكيل (Proxy) حتى لا تتغيّر مواضع الاستدعاء في التطبيق.

const g = globalThis as unknown as {
  __nafPrismaNode?: PrismaClient;
  __nafPrismaD1?: PrismaClient;
  __nafMode?: string;
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
      g.__nafMode = "d1(env:" + Object.keys(env || {}).join(",") + ")";
      if (!g.__nafPrismaD1) {
        g.__nafPrismaD1 = new PrismaClient({ adapter: new PrismaD1(DB) });
      }
      return g.__nafPrismaD1;
    }
    g.__nafMode = "node(no-DB;env:" + Object.keys(env || {}).join(",") + ")";
  } catch (e: any) {
    g.__nafMode = "node(ctx-error:" + (e?.message || e) + ")";
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
