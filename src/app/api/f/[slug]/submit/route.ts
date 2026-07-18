import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeParse, gradeAnswer } from "@/lib/utils";

// استلام رد على النموذج (عام) مع تسجيل تاريخ ووقت التقديم وحساب درجة الاختبار
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const body = await req.json();
  const answers: Record<string, any> = body.answers || {};

  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    include: { questions: true },
  });
  if (!form)
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });
  if (form.status === "CLOSED")
    return NextResponse.json({ error: "النموذج مغلق" }, { status: 403 });

  // التحقق من الأسئلة الإلزامية
  for (const q of form.questions) {
    if (q.required) {
      const v = answers[q.id];
      const empty =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty)
        return NextResponse.json(
          { error: `السؤال «${q.label}» إلزامي` },
          { status: 400 }
        );
    }
  }

  // حساب الدرجة للاختبارات
  let score = 0;
  let total = 0;
  if (form.type === "EXAM") {
    for (const q of form.questions) {
      const cfg = safeParse<Record<string, any>>(q.config, {});
      if (cfg.correctAnswer !== undefined && cfg.correctAnswer !== "") {
        total += Number(cfg.points ?? 1);
        const { points } = gradeAnswer(q.type, cfg, answers[q.id]);
        score += points;
      }
    }
  }

  const meta = {
    userAgent: req.headers.get("user-agent") || "",
    score: form.type === "EXAM" ? score : undefined,
    total: form.type === "EXAM" ? total : undefined,
  };

  const response = await prisma.response.create({
    data: {
      formId: form.id,
      meta: JSON.stringify(meta),
      answers: {
        create: form.questions
          .filter((q) => answers[q.id] !== undefined)
          .map((q) => ({
            questionId: q.id,
            value: JSON.stringify(answers[q.id]),
          })),
      },
    },
  });

  return NextResponse.json({
    ok: true,
    responseId: response.id,
    score: meta.score,
    total: meta.total,
  });
}
