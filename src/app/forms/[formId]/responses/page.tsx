import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormWithResponses, getVisitStats, getReviewsByForm } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import { FORM_TYPE_LABELS, FORM_TYPE_CHIP } from "@/lib/field-types";
import { safeParse, answerToText, formatDateTime, isInputQuestion } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import AppChrome from "@/components/AppChrome";
import ResponsesDashboard, {
  type QuestionStat,
  type ResponseRow,
} from "@/components/dashboard/ResponsesDashboard";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/naf-format";

export const dynamic = "force-dynamic";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const formId = (await params).formId;
  if (!(await authorizeForm(formId))) notFound();
  const [form, visitStats, reviews] = await Promise.all([
    getFormWithResponses(formId),
    getVisitStats(formId),
    getReviewsByForm(formId),
  ]);
  if (!form || !form.project) notFound();

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

    if (["MULTIPLE_CHOICE", "DROPDOWN", "CHECKBOXES", "IMAGE_CHOICE"].includes(q.type)) {
      const options: string[] =
        q.type === "IMAGE_CHOICE"
          ? (cfg.options || []).map((o: any) => o.label)
          : cfg.options || [];
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
        // نفرد الملفات المتعددة كعناصر مستقلة في العيّنات
        samples: values
          .flatMap((v) => (Array.isArray(v) ? v : [v]))
          .filter((f: any) => f)
          .slice(0, 50)
          .map((f: any) => ({ text: f?.name || "ملف", url: f?.url })),
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
          text: answerToText(q.type, v, cfg),
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
      samples: values.slice(0, 50).map((v) => ({ text: answerToText(q.type, v, cfg) })),
    };
  });

  // إعدادات كل سؤال (تُستخدم في تنسيق الإجابات مثل عدد النجوم)
  const cfgById: Record<string, Record<string, any>> = {};
  for (const q of questions)
    cfgById[q.id] = safeParse<Record<string, any>>(q.config, {});

  // صفوف الردود الفردية
  const rows: ResponseRow[] = form.responses.map((r) => {
    const byQ: Record<string, any> = {};
    for (const a of r.answers) byQ[a.questionId] = safeParse(a.value, "");
    const meta = safeParse<any>(r.meta, {});
    return {
      id: r.id,
      submittedAt: formatDateTime(r.submittedAt),
      ts: r.submittedAt.toISOString(),
      email: meta.email || undefined,
      score:
        form.type === "EXAM" && meta.total != null
          ? `${meta.score ?? 0} / ${meta.total}`
          : undefined,
      status: reviews[r.id]?.status || "NEW",
      rating: reviews[r.id]?.rating || 0,
      notes: reviews[r.id]?.notes || "",
      cells: questions.map((q) => {
        const v = byQ[q.id];
        return {
          label: q.label,
          type: q.type,
          text: answerToText(q.type, v, cfgById[q.id]),
          url: q.type === "FILE" && !Array.isArray(v) && v?.url ? v.url : undefined,
          // تعدّد الملفات: قائمة روابط
          urls:
            q.type === "FILE" && Array.isArray(v)
              ? v
                  .filter((f: any) => f?.url)
                  .map((f: any) => ({ name: f.name || "ملف", url: f.url }))
              : undefined,
          loc: q.type === "LOCATION" && v && typeof v === "object" ? v : undefined,
        };
      }),
    };
  });

  // توزيع الردود حسب اليوم (آخر النتائج).
  // `ar-SA` كانت تُنتج أرقامًا عربية-هندية على محور الرسم البياني، و naf-terms
  // §٥ تفرض الأرقام الغربية. نشتقّ اليوم/الشهر من التاريخ المعتمد نفسه.
  // المفتاح بالسنة والعرض بلا سنة: كان التجميع على `MM/DD` وحدها، فردّان
  // في اليوم نفسه من سنتين يقعان في عمود واحد.
  const byDay = new Map<string, { label: string; count: number }>();
  // ترتيب تصاعدي زمنيًا للعرض
  const ordered = [...form.responses].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
  );
  for (const r of ordered) {
    const full = formatDate(r.submittedAt); // YYYY/MM/DD
    const entry = byDay.get(full) ?? { label: full.slice(5), count: 0 };
    entry.count += 1;
    byDay.set(full, entry);
  }
  const timeline = Array.from(byDay.values()).slice(-30);

  // متوسط درجات الاختبار
  /* متوسط الدرجات كنسبة، لا كسرًا على مقام عشوائي.

     كان `t = m.total ?? t` يأخذ قيمة **آخر ردّ** تمرّ عليه الحلقة. ومع بنك
     أسئلة عشوائي — أو بعد تعديل أسئلة الاختبار — تختلف `total` بين ردّ
     وآخر، فالمقام لا يمثّل شيئًا والكسر يقارن ما لا يُقارَن.

     فالمتوسط يُحسب على النسب: كل ردّ يُقاس بمقامه هو، ثم تُجمع النسب.
     والردود بلا مقام (`total = 0`) تُستثنى ولا تُحسب صفرًا. */
  let examAvg: string | null = null;
  if (form.type === "EXAM" && form.responses.length) {
    let sum = 0;
    let counted = 0;
    for (const r of form.responses) {
      const m = safeParse<any>(r.meta, {});
      const total = Number(m.total ?? 0);
      if (total <= 0) continue;
      sum += (Number(m.score ?? 0) / total) * 100;
      counted += 1;
    }
    if (counted) examAvg = `${(sum / counted).toFixed(1)}%`;
  }

  // تحليلات الإكمال: معدّل الإكمال، زمن التعبئة، ونقاط التسرّب بأسماء الأسئلة
  const labelById = new Map(form.questions.map((q) => [q.id, q.label]));
  const funnel = {
    started: visitStats.started,
    completed: visitStats.completed,
    rate: visitStats.started
      ? Math.round((visitStats.completed / visitStats.started) * 100)
      : null,
    avgSeconds: visitStats.avgSeconds,
    dropOff: visitStats.dropOff.slice(0, 8).map((d) => ({
      label: labelById.get(d.questionId) || "—",
      count: d.count,
    })),
  };

  return (
    <AppChrome
      crumbs={[
        { label: form.project.name, href: `/projects/${form.projectId}` },
        { label: form.title },
      ]}
      width="wide"
    >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">ردود: {form.title}</h1>
            <span className={`chip mt-1 ${FORM_TYPE_CHIP[form.type]}`}>
              {FORM_TYPE_LABELS[form.type]}
            </span>
          </div>
          <Link
            href={`/forms/${form.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Icon name="edit" className="h-4 w-4" /> تعديل النموذج
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
          funnel={funnel}
        />
    </AppChrome>
  );
}
