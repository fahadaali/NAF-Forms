import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeParse, answerToText, formatDateTime, isInputQuestion } from "@/lib/utils";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintResponsePage({
  params,
}: {
  params: Promise<{ formId: string; responseId: string }>;
}) {
  const [form, response] = await Promise.all([
    prisma.form.findUnique({
      where: { id: (await params).formId },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.response.findUnique({
      where: { id: (await params).responseId },
      include: { answers: true },
    }),
  ]);
  if (!form || !response) notFound();

  const byQ: Record<string, any> = {};
  for (const a of response.answers) byQ[a.questionId] = safeParse(a.value, "");
  const meta = safeParse<any>(response.meta, {});
  const questions = form.questions.filter((q) => isInputQuestion(q.type));

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      <PrintButton />
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold">{form.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          🕓 {formatDateTime(response.submittedAt)}
          {meta.email ? ` · ✉️ ${meta.email}` : ""}
          {form.type === "EXAM" && meta.total != null
            ? ` · الدرجة: ${meta.score ?? 0}/${meta.total}`
            : ""}
        </p>
      </div>
      <dl className="space-y-4">
        {questions.map((q) => (
          <div key={q.id}>
            <dt className="text-sm font-bold text-slate-700">{q.label}</dt>
            <dd className="mt-1 whitespace-pre-line text-slate-900">
              {answerToText(q.type, byQ[q.id]) || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
