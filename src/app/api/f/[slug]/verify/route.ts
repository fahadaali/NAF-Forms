import { NextResponse } from "next/server";
import { getFormBySlug } from "@/lib/repo";
import { parseSettings } from "@/lib/utils";
import { toPublicForm } from "@/lib/public-form";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { timingSafeEqual } from "@/lib/compare";

// التحقق من كلمة مرور النموذج — **وهو ما يفتح النموذج، لا المتصفّح**.
//
// كانت الأسئلة تُرسل كاملةً مع الصفحة، والبوابة تُرسم فوقها في المتصفّح.
// فمن عطّل الجافاسكربت — أو قرأ مصدر الصفحة — رأى نموذجًا «محميًّا» كاملًا.
// اليوم الصفحة ترسل العنوان وحده (`toLockedForm`)، وهذا المسار هو من يسلّم
// الأسئلة بعد قبول الكلمة.
//
// وحدّ المعدّل هنا لازم لا زينة: هذا المسار وحده كان بلا حدّ بين مسارات
// `‎/api/f/`، وكلمةُ مرورٍ بلا حدّ محاولات تُخمَّن آليًا في دقائق.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`verify:${clientIp(req)}`, 10, 60_000))
    return NextResponse.json(
      { error: "محاولات كثيرة، حاول لاحقًا" },
      { status: 429 }
    );

  const body = await req.json().catch(() => ({}));
  const form = await getFormBySlug((await params).slug);
  if (!form)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const password = parseSettings(form.settings).access?.password || "";
  const ok = !password || timingSafeEqual(String(body.password || ""), password);
  if (!ok) return NextResponse.json({ ok: false });

  return NextResponse.json({ ok: true, form: toPublicForm(form) });
}
