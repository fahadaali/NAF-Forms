import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleCallback } from "naf-auth";
import { ssoConfig } from "@/lib/sso";

// مسار الاستقبال. الترتيب كلّه داخل `naf-auth`: مطابقة الحالة العابرة وحذفها،
// ثم المبادلة خادماً لخادم، ثم التحقق الكامل من التوقيع و`iss` و`aud` و`exp`،
// ثم إنشاء العضو، ثم كوكي الجلسة والتحويل إلى الوجهة بعد تنقيتها.
// لا شيء من ذلك يُنسخ هنا (§٤).

export async function GET(req: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  return handleCallback(req, env, ssoConfig(env));
}
