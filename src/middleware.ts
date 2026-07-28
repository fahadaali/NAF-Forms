import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { authenticate } from "@/lib/naf-id";
import { ssoConfig, H_SUB, H_ROLE, H_PERMS } from "@/lib/sso";

// الحارس. القرار كلّه في `src/lib/naf-id/` — التحويل إلى المركز، والتحقق من
// التوقيع و`exp` في كل طلب محمي، وقراءة العضو. وهذا الملف يصل نتيجتها بـ Next.
//
// لماذا هنا لا في `functions/_middleware.js`: هذه المنصة Next.js على Workers
// عبر OpenNext، ولا يُنفَّذ فيها اصطلاح Pages Functions.

/** ترويسات الهوية تُمسح من الطلب الوارد قبل حقنها — وإلا انتحلها المتصفح. */
function cleanHeaders(req: NextRequest): Headers {
  const h = new Headers(req.headers);
  h.delete(H_SUB);
  h.delete(H_ROLE);
  h.delete(H_PERMS);
  return h;
}

/** طلب واجهة برمجية لا يُحوَّل — يعود برمز حالة يفهمه العميل. */
function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { env } = await getCloudflareContext({ async: true });
  const bindings = env as unknown as Record<string, unknown>;
  const config = ssoConfig(bindings);

  const result = await authenticate(req, bindings, config);

  if (result.kind === "login" || result.kind === "denied") {
    if (isApi(pathname))
      return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 401 });
    return new NextResponse(result.response.body, {
      status: result.response.status,
      headers: result.response.headers,
    });
  }

  // مسار عام: يمرّ بلا هوية، ومع ذلك تُمسح الترويسات المنتحَلة.
  if (result.kind === "public") {
    return NextResponse.next({ request: { headers: cleanHeaders(req) } });
  }

  // إعدادات الصلاحيات للمسؤول وحده.
  if (
    pathname.startsWith("/members") ||
    pathname.startsWith("/api/members") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/api/users")
  ) {
    if (result.user.role !== "admin") {
      if (isApi(pathname))
        return NextResponse.json({ error: "للمسؤول فقط" }, { status: 403 });
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  const headers = cleanHeaders(req);
  headers.set(H_SUB, result.sub);
  headers.set(H_ROLE, result.user.role);
  if (result.user.perms) headers.set(H_PERMS, JSON.stringify(result.user.perms));

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
