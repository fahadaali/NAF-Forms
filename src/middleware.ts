import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// المسارات العامة المتاحة دون تسجيل دخول (صفحة التقديم وواجهاتها ورفع الملفات)
const PUBLIC_PREFIXES = ["/f/", "/api/f/", "/login", "/api/login"];
const PUBLIC_EXACT = ["/api/upload"];

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.includes(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

// حارس بسيط: كل ما عدا صفحة التقديم يتطلب تسجيل دخول المشرف
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get("naf_admin")?.value;
  const expected = process.env.ADMIN_PASSWORD || "naf-admin";
  if (token && token === expected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // استثناء ملفات Next الثابتة وأي مسار يحوي امتدادًا (مثل /uploads/x.pdf)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
