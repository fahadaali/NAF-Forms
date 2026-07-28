import { getCloudflareContext } from "@opennextjs/cloudflare";
import { clearCookie, handleLogout } from "naf-auth";
import { SESSION_COOKIE } from "@/lib/auth";
import { ssoConfig } from "@/lib/sso";

// تسجيل الخروج — في الحزمة، ووجهته المركز.
//
// الجلسة اليوم في `AUTH_KV` لا في كوكي موقّع محلياً، فمسحُ الكوكي وحده
// يترك الجلسة حيّة في المساحة: من احتفظ بقيمة الكوكي يعود بها. فيُحذف
// المفتاح أولاً ثم يُمسح الكوكي — وهذا ما يفعله `handleLogout`، وفشلُ
// الحذف لا يمنع الخروج.
//
// **والوجهة بعده المركز لا `‎/`.** كانت اللوحة تنتقل إلى الجذر بعد الخروج،
// والجذر محميّ: يحوّله الوسيط إلى `‎/go/NAF-Forms`، وجلسة المركز لم تُمسّ
// فتُصدر رمزاً جديداً — فيعود الخارجُ إلى شاشته قبل أن يقرأ شيئاً. الحذف
// والمسح كانا يقعان فعلاً، ولا أثر يراه المستخدم، فيقرأ من ذلك أن الزرّ
// لا يعمل.
//
// والمسار عامّ في `PUBLIC_EXACT` عمداً: لو حماه الوسيط لتعذّر الخروج على
// من انتهى رمزه — يُحوَّل إلى المركز مكان أن تُغلق جلسته.
//
// وكوكي كلمة المرور القديم يُمسح معه: لم يعد يُقرأ في أي مسار، ومسحه
// يمنع بقاءه في المتصفح بعد أن أُغلق بابه. ولا تعرفه الحزمة، فيُضاف على
// ردّها ولا يُعاد بناء الردّ حوله.
export async function POST(req: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });

  const res = await handleLogout(req, env, ssoConfig(env));

  // ترويسات `Response` المعاد غير قابلة للتعديل، فتُنسخ ويُضاف إليها.
  const headers = new Headers(res.headers);
  headers.append("set-cookie", clearCookie(SESSION_COOKIE));
  return new Response(res.body, { status: res.status, headers });
}
