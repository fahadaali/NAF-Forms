import { NextResponse } from "next/server";
import { getFormBySlug } from "@/lib/repo";
import { parseSettings } from "@/lib/utils";

// التحقق من كلمة مرور النموذج دون كشفها للعميل
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const body = await req.json();
  const form = await getFormBySlug((await params).slug);
  if (!form)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const password = parseSettings(form.settings).access?.password || "";
  const ok = !password || String(body.password || "") === password;
  return NextResponse.json({ ok });
}
