import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FORM_TYPE_LABELS } from "@/lib/field-types";
import { safeParse, answerToText, formatDateTime, isInputQuestion } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import ResponsesDashboard, {
  type QuestionStat,
  type ResponseRow,
} from "@/components/dashboard/ResponsesDashboard";

export const dynamic = "force-dynamic";

export default async function ResponsesPage({
  params,
}: {
  params: { formId: string };
}) {
  const form = await prisma.form.findUnique({
    where: { id: params.formId },
    include: {
      project: true,
      questions: { orderBy: { order: "asc" } },
      responses: {
        orderBy: { submittedAt: "desc" },
        include: { answers: true },
      },
    },
  });
  if (!form) notFound();

  const questions = form.questions.filter((q) => isInputQuestion(q.type));

  // فهرسة الإجابات: questionId -> [values]
  const valuesByQ: Record<string, any[]> = {};
  for (const q of questions) valuesByQ[q.id] = [];
  for (const r of form.responses) {
    for (const a of r.answers) {
      if (valuesByQ[a.questionId]) valuesByQ[a.questionId].push(safeParse(a.value, ""));
    }
  }

  const notEmpty = (v: any) =>
    !(v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0));

  // حساب التحليلات لكل سؤال حسب نوعه
  const stats: QuestionStat[] = questions.map((q) => {
    const cfg = safeParse<Record<string, any>>(q.config, {});
    const values = (valuesByQ[q.id] || []).filter(notEmpty);
    const answered = values.length;

    if (["MULTIPLE_CHOICE", "DROPDOWN", "CHECKBOXES"].includes(q.type)) {
      const options: string[] = cfg.options || [];
      const counts: Record<string, number> = {};
      for (const o of options) counts[o] = 0;
      for (const v of values) {
        const arr = Array.isArray(v) ? v : [v];
        for (const item of arr) counts[item] = (counts[item] || 0) + 1;
      }
      return {
        id: q.id,
        label: q.label,
        type: q.type,
        kind: "distribution",
        answered,
        buckets: Object.entries(counts).map(([label, count]) => ({ label, count })),
      };
    }

    if (["LINEAR_SCALE", "RATING"].includes(q.type)) {
      const min = q.type === "RATING" ? 1 : Number(cfg.min ?? 1);
      const max = q.type === "RATING" ? Number(cfg.max ?? 5) : Number(cfg.max ?? 5);
      const buckets: { label: string; count: number }[] = [];
      let sum = 0;
      for (let n = min; n <= max; n++) {
        const count = values.filter((v) => Number(v) === n).length;
        buckets.push({ label: String(n), count });
      }
      for (const v of values) sum += Number(v) || 0;
      return {
        id: q.id,
        label: q.label,
        type: q.type,
        kind: "numeric",
        answered,
        buckets,
        average: answered ? sum / answered : null,
      };
    }

    if (q.type === "GRID") {
      const rows: string[] = cfg.rows || [];
      const cols: string[] = cfg.cols || [];
      const gridRows = rows.map((row) => {
        const colCounts: Record<string, number> = {};
        for (const c of cols) colCounts[c] = 0;
        for (const v of values) {
          if (v && typeof v === "object") {
            const cell = v[row];
            const chosen = Array.isArray(cell) ? cell : cell ? [cell] : [];
            for (const c of chosen) colCounts[c] = (colCounts[c] || 0) + 1;
          }
        }
        return {
          row,
          cols: cols.map((label) => ({ label, count: colCounts[label] })),
        };
      });
      return { id: q.id, label: q.label, type: q.type, kind: "grid", answered, gridRows };
    }

    if (q.type === "FILE") {
      return {
        id: q.id,
        label: q.label,
        type: q.type,
        kind: "file",
        answered,
        samples: values.slice(0, 50).map((v) => ({
          text: v?.name || "ملف",
          url: v?.url,
        })),
      };
    }

    if (q.type === "LOCATION") {
      return {
        id: q.id,
        label: q.label,
        type: q.type,
        kind: "location",
        answered,
        samples: values.slice(0, 50).map((v) => ({
          text: answerToText(q.type, v),
          url:
            v && typeof v === "object"
              ? `https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=15/${v.lat}/${v.lng}`
              : undefined,
        })),
      };
    }

    // نصوص وأرقام وتواريخ وعناوين
    return {
      id: q.id,
      label: q.label,
      type: q.type,
      kind: "text",
      answered,
      samples: values.slice(0, 50).map((v) => ({ text: answerToText(q.type, v) })),
    };
  });

  // صفوف الردود الفردية
  const rows: ResponseRow[] = form.responses.map((r) => {
    const byQ: Record<string, any> = {};
    for (const a of r.answers) byQ[a.questionId] = safeParse(a.value, "");
    const meta = safeParse<any>(r.meta, {});
    return {
      id: r.id,
      submittedAt: formatDateTime(r.submittedAt),
      score:
        form.type === "EXAM" && meta.total != null
          ? `${meta.score ?? 0} / ${meta.total}`
          : undefined,
      cells: questions.map((q) => {
        const v = byQ[q.id];
        return {
          label: q.label,
          type: q.type,
          text: answerToText(q.type, v),
          url: q.type === "FILE" && v?.url ? v.url : undefined,
          loc: q.type === "LOCATION" && v && typeof v === "object" ? v : undefined,
        };
      }),
    };
  });

  // توزيع الردود حسب اليوم (آخر النتائج)
  const dayFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "numeric",
  });
  const byDay = new Map<string, number>();
  // ترتيب تصاعدي زمنيًا للعرض
  const ordered = [...form.responses].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
  );
  for (const r of ordered) {
    const key = dayFmt.format(r.submittedAt);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  const timeline = Array.from(byDay.entries())
    .slice(-30)
    .map(([label, count]) => ({ label, count }));

  // متوسط درجات الاختبار
  let examAvg: string | null = null;
  if (form.type === "EXAM" && form.responses.length) {
    let s = 0;
    let t = 0;
    for (const r of form.responses) {
      const m = safeParse<any>(r.meta, {});
      s += m.score ?? 0;
      t = m.total ?? t;
    }
    examAvg = `${(s / form.responses.length).toFixed(1)} / ${t}`;
  }

  return (
    <div className="min-h-screen">
      <Navbar
        crumbs={[
          { label: form.project.name, href: `/projects/${form.projectId}` },
          { label: form.title },
        ]}
      />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">ردود: {form.title}</h1>
            <span className="chip mt-1 bg-naf-50 text-naf-700">
              {FORM_TYPE_LABELS[form.type]}
            </span>
          </div>
          <Link href={`/forms/${form.id}/edit`} className="btn-ghost text-sm">
            ✏️ تحرير النموذج
          </Link>
        </div>

        <ResponsesDashboard
          formId={form.id}
          formType={form.type}
          total={form.responses.length}
          examAvg={examAvg}
          stats={stats}
          rows={rows}
          timeline={timeline}
        />
      </main>
    </div>
  );
}
