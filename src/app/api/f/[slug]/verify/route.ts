import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSettings } from "@/lib/utils";

// التحقق من كلمة مرور النموذج دون كشفها للعميل
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const body = await req.json();
  const form = await prisma.form.findUnique({
    where: { slug: (await params).slug },
    select: { settings: true },
  });
  if (!form)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const password = parseSettings(form.settings).access?.password || "";
  const ok = !password || String(body.password || "") === password;
  return NextResponse.json({ ok });
}
