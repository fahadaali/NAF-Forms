import { NextResponse } from "next/server";

// تسجيل خروج المشرف
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("naf_admin", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
