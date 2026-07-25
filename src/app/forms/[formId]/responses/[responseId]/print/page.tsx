import { notFound } from "next/navigation";
import { getResponseWithAnswers } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { safeParse, answerToText, formatDateTime, isInputQuestion } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintResponsePage({
  params,
}: {
  params: Promise<{ formId: string; responseId: string }>;
}) {
  const { formId, responseId } = await params;
  const [auth, response] = await Promise.all([
    authorizeForm(formId),
    getResponseWithAnswers(responseId),
  ]);
  // لا بد من صلاحية على النموذج، وأن يكون الرد تابعًا له فعلًا
  if (!auth || !response || response.formId !== formId) notFound();
  const form = auth.form;

  const byQ: Record<string, any> = {};
  for (const a of response.answers) byQ[a.questionId] = safeParse(a.value, "");
  const meta = safeParse<any>(response.meta, {});
  const questions = form.questions.filter((q) => isInputQuestion(q.type));

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      <PrintButton />
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold">{form.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <Icon name="clock" className="h-4 w-4" />
          {formatDateTime(response.submittedAt)}
          {meta.email ? (
            <>
              <span>·</span>
              <Icon name="mail" className="h-4 w-4" />
              {meta.email}
            </>
          ) : null}
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
              {answerToText(
                q.type,
                byQ[q.id],
                safeParse<Record<string, any>>(q.config, {})
              ) || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
