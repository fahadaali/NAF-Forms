import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// المسارات العامة المتاحة دون تسجيل دخول
const PUBLIC_PREFIXES = [
  "/f/",
  "/api/f/",
  "/login",
  "/api/login",
  "/change-password",
  "/api/change-password",
  "/api/logout",
];
const PUBLIC_EXACT = ["/api/upload"];

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.includes(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname.startsWith("/api/"))
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // إلزام تغيير كلمة المرور عند أول دخول
  if (session.mustChange) {
    const url = req.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  // لوحة المستخدمين للمسؤول فقط
  if (pathname.startsWith("/users") || pathname.startsWith("/api/users")) {
    if (session.role !== "admin") {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: "للمسؤول فقط" }, { status: 403 });
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
