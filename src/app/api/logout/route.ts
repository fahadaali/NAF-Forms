import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { clearCookie, readCookie } from "naf-auth";
import { SESSION_COOKIE } from "@/lib/auth";
import { ssoConfig } from "@/lib/sso";

// تسجيل الخروج.
//
// الجلسة اليوم في `AUTH_KV` لا في كوكي موقّع محلياً، فمسحُ الكوكي وحده
// يترك الجلسة حيّة في المساحة: من احتفظ بقيمة الكوكي يعود بها. فيُحذف
// المفتاح أولاً ثم يُمسح الكوكي.
//
// والمسار عامّ في `PUBLIC_EXACT` عمداً: لو حماه الوسيط لتعذّر الخروج على
// من انتهى رمزه — يُحوَّل إلى المركز مكان أن تُغلق جلسته.
//
// وكوكي كلمة المرور القديم يُمسح معه: لم يعد يُقرأ في أي مسار، ومسحه
// يمنع بقاءه في المتصفح بعد أن أُغلق بابه.
export async function POST(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const config = ssoConfig(env);

  const sid = readCookie(req, config.cookieName);
  if (sid) {
    // فشلُ المسح لا يمنع الخروج: الكوكي يُمسح على أي حال، والجلسة تنتهي
    // بانتهاء عمرها القصير — عمر الرمز، ربع ساعة على أكثر تقدير.
    try {
      await config.kv(env).delete(`sess:${sid}`);
    } catch {
      /* لا شيء يُعرض للمستخدم: الخروج تمّ من طرفه */
    }
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("set-cookie", clearCookie(config.cookieName));
  res.headers.append("set-cookie", clearCookie(SESSION_COOKIE));
  return res;
}
