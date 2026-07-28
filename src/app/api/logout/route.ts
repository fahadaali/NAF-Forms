import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SESSION_COOKIE } from "@/lib/auth";
import { authKv, readCookie, sessionKey } from "@/lib/naf-id";
import { ssoConfig } from "@/lib/sso";

// تسجيل الخروج.
//
// الجلسة تُحذف من KV لا يُكتفى بمسح الكوكي: من نسخ الكوكي قبل الخروج يظلّ
// داخلاً لولا ذلك — ومسحُ الكوكي وحده يُخرج المتصفحَ لا الجلسة.
//
// والكوكي القديم يُمسح معه: كتبه بابُ كلمة المرور السابق، ولم يعد يُقرأ في
// أي موضع، فمسحه تنظيف لا حماية.
export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  const { env } = await getCloudflareContext({ async: true });
  const bindings = env as unknown as Record<string, unknown>;
  const config = ssoConfig(bindings);

  try {
    const sid = readCookie(req, config.cookieName);
    if (sid) await authKv(bindings).delete(sessionKey(sid));
  } catch {
    // تعذّر الوصول إلى KV لا يمنع مسح الكوكي: الجلسة تنقضي بنفسها خلال
    // ربع ساعة على كل حال.
  }

  res.cookies.set(config.cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
