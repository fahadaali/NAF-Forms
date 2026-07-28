import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleCallback } from "@/lib/naf-id";
import { ssoConfig, linkExistingUser } from "@/lib/sso";

// مسار الاستقبال. الترتيب كلّه في `src/lib/naf-id/handshake.ts`: المبادلة
// خادماً لخادم بـ`platformId` و`secret` و`code` و`state`، ثم التحقق الكامل من
// التوقيع و`iss` و`aud` و`exp`، ثم ربط العضو القائم، ثم إنشاؤه أو تحديثه،
// ثم كوكي الجلسة والتحويل إلى الوجهة بعد تنقيتها.
//
// و`code` لا يُعاد استعماله مهما كان سبب الفشل: عمره ستون ثانية ويُستهلك
// مرة واحدة عند المركز، فالمحاولة الثانية تفشل حتماً.

export async function GET(req: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  const bindings = env as unknown as Record<string, unknown>;
  return handleCallback(req, bindings, ssoConfig(bindings), linkExistingUser);
}
