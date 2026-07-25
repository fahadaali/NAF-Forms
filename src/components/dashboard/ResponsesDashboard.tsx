"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_CHIP,
} from "@/lib/review";

export interface QuestionStat {
  id: string;
  label: string;
  type: string;
  kind: "distribution" | "numeric" | "grid" | "text" | "file" | "location";
  answered: number;
  // distribution / numeric
  buckets?: { label: string; count: number }[];
  average?: number | null;
  // grid
  gridRows?: { row: string; cols: { label: string; count: number }[] }[];
  // text/file/location samples
  samples?: { text: string; url?: string }[];
}

export interface ResponseRow {
  id: string;
  submittedAt: string;
  ts: string; // ISO للفرز والتصفية الزمنية
  score?: string;
  email?: string;
  // مراجعة الرد (تتبّع المتقدمين)
  status: string;
  rating: number;
  notes: string;
  cells: {
    label: string;
    type: string;
    text: string;
    url?: string;
    urls?: { name: string; url: string }[];
    loc?: { lat: number; lng: number };
  }[];
}

export interface FunnelStats {
  started: number;
  completed: number;
  rate: number | null;
  avgSeconds: number | null;
  dropOff: { label: string; count: number }[];
}

export default function ResponsesDashboard({
  formId,
  formType,
  total,
  examAvg,
  stats,
  rows,
  timeline,
  funnel,
}: {
  formId: string;
  formType: string;
  total: number;
  examAvg: string | null;
  stats: QuestionStat[];
  rows: ResponseRow[];
  timeline: { label: string; count: number }[];
  funnel: FunnelStats;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"summary" | "individual">("summary");
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // مراجعات محلّية حتى تظهر التعديلات فورًا دون إعادة تحميل
  const [reviews, setReviews] = useState<
    Record<string, { status: string; rating: number; notes: string }>
  >(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.id,
        { status: r.status, rating: r.rating, notes: r.notes },
      ])
    )
  );

  const reviewOf = (id: string) =>
    reviews[id] || { status: "NEW", rating: 0, notes: "" };

  async function saveReview(
    id: string,
    patch: Partial<{ status: string; rating: number; notes: string }>
  ) {
    setReviews((prev) => ({ ...prev, [id]: { ...reviewOf(id), ...patch } }));
    await fetch(`/api/responses/${id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  // عدّاد لكل حالة
  const statusCounts = REVIEW_STATUSES.map((s) => ({
    status: s as string,
    count: rows.filter((r) => reviewOf(r.id).status === s).length,
  })).filter((x) => x.count > 0);

  const filteredRows = rows.filter((r) => {
    if (statusFilter && reviewOf(r.id).status !== statusFilter) return false;
    if (query.trim()) {
      const hay = [
        r.email || "",
        r.submittedAt,
        r.score || "",
        ...r.cells.map((c) => c.text),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query.trim().toLowerCase())) return false;
    }
    const t = new Date(r.ts).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime() + 86_399_000) return false; // نهاية اليوم
    return true;
  });

  // رابط التصدير يحمل نفس الفلاتر المطبّقة، فيُصدَّر ما يراه المستخدم فقط
  function exportUrl(format: "csv" | "xlsx" | "json") {
    const p = new URLSearchParams({ format });
    if (query.trim()) p.set("q", query.trim());
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (statusFilter) p.set("status", statusFilter);
    return `/api/forms/${formId}/export?${p.toString()}`;
  }

  async function deleteResponse(id: string) {
    if (!confirm("حذف هذا الرد نهائيًا؟")) return;
    setBusy(id);
    await fetch(`/api/responses/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      {/* بطاقات إحصائية */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon="chart" label="إجمالي الردود" value={String(total)} />
        <StatCard
          icon="clock"
          label="آخر رد"
          value={rows[0]?.submittedAt || "—"}
        />
        {formType === "EXAM" ? (
          <StatCard icon="target" label="متوسط الدرجات" value={examAvg || "—"} />
        ) : (
          <StatCard icon="list" label="عدد الأسئلة" value={String(stats.length)} />
        )}
      </div>

      {/* أزرار التصدير + التبويبات */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
          <button
            className={`rounded-lg px-4 py-1.5 font-medium ${tab === "summary" ? "bg-white shadow-sm" : "text-slate-500"}`}
            onClick={() => setTab("summary")}
          >
            ملخص وتحليلات
          </button>
          <button
            className={`rounded-lg px-4 py-1.5 font-medium ${tab === "individual" ? "bg-white shadow-sm" : "text-slate-500"}`}
            onClick={() => setTab("individual")}
          >
            الردود الفردية
          </button>
        </div>
        <div className="flex gap-2">
          {(["csv", "xlsx", "json"] as const).map((fmt) => (
            <a
              key={fmt}
              className="btn-ghost inline-flex items-center gap-1.5 py-1.5 text-sm"
              href={exportUrl(fmt)}
            >
              <Icon name="download" className="h-4 w-4" />
              {fmt === "csv" ? "CSV" : fmt === "xlsx" ? "Excel" : "JSON"}
            </a>
          ))}
        </div>
      </div>

      {total === 0 && (
        <div className="card grid place-items-center p-12 text-center text-slate-500">
          <Icon name="mail" className="mb-2 h-10 w-10 text-slate-300" />
          لا توجد ردود بعد.
        </div>
      )}

      {total > 0 && tab === "summary" && (
        <div className="space-y-4">
          <FunnelPanel funnel={funnel} />
          {timeline.length > 1 && <TimelineChart data={timeline} />}
          <CrossTab stats={stats} rows={rows} />
          {stats.map((q) => (
            <StatBlock key={q.id} q={q} />
          ))}
        </div>
      )}

      {total > 0 && tab === "individual" && (
        <div className="space-y-4">
          <div className="relative">
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              className="input pr-9"
              aria-label="بحث في الردود"
              placeholder="بحث في الردود…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">من</span>
            <input type="date" className="input py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-slate-500">إلى</span>
            <input type="date" className="input py-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
            {(from || to || query || statusFilter) && (
              <button
                className="text-naf-600 hover:underline"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setQuery("");
                  setStatusFilter("");
                }}
              >
                مسح
              </button>
            )}
          </div>

          {/* تصفية حسب حالة المراجعة */}
          {statusCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setStatusFilter("")}
                className={`chip ${
                  statusFilter === ""
                    ? "bg-naf-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                الكل ({rows.length})
              </button>
              {statusCounts.map(({ status, count }) => (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter(statusFilter === status ? "" : status)
                  }
                  className={`chip ${
                    statusFilter === status
                      ? "bg-naf-600 text-white"
                      : REVIEW_STATUS_CHIP[status]
                  }`}
                >
                  {REVIEW_STATUS_LABELS[status]} ({count})
                </button>
              ))}
            </div>
          )}
          {(query || from || to) && (
            <p className="text-sm text-slate-400">
              {filteredRows.length} نتيجة من {rows.length}
            </p>
          )}
          {filteredRows.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="flex items-center gap-2 font-bold">
                  رد #{rows.length - rows.indexOf(r)}
                  <span
                    className={`chip ${REVIEW_STATUS_CHIP[reviewOf(r.id).status]}`}
                  >
                    {REVIEW_STATUS_LABELS[reviewOf(r.id).status]}
                  </span>
                  {reviewOf(r.id).rating > 0 && (
                    <span className="text-xs text-amber-500">
                      {"★".repeat(reviewOf(r.id).rating)}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {r.email && (
                    <span className="chip inline-flex items-center gap-1 bg-slate-100 text-slate-600" dir="ltr">
                      <Icon name="mail" className="h-3.5 w-3.5" /> {r.email}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Icon name="clock" className="h-3.5 w-3.5" /> {r.submittedAt}
                  </span>
                  <a
                    href={`/forms/${formId}/responses/${r.id}/print`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    <Icon name="printer" className="h-3.5 w-3.5" /> طباعة
                  </a>
                  <button
                    onClick={() => deleteResponse(r.id)}
                    disabled={busy === r.id}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === r.id ? (
                      "…"
                    ) : (
                      <>
                        <Icon name="trash" className="h-3.5 w-3.5" /> حذف
                      </>
                    )}
                  </button>
                </div>
              </div>
              {r.score && (
                <div className="mb-2 inline-block rounded-lg bg-naf-50 px-3 py-1 text-sm font-bold text-naf-700">
                  الدرجة: {r.score}
                </div>
              )}
              <dl className="grid gap-2 sm:grid-cols-2">
                {r.cells.map((c, j) => (
                  <div key={j} className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-medium text-slate-400">{c.label}</dt>
                    <dd className="mt-0.5 text-sm">
                      {c.urls && c.urls.length ? (
                        <span className="flex flex-col gap-0.5">
                          {c.urls.map((f, k) => (
                            <a
                              key={k}
                              href={f.url}
                              target="_blank"
                              className="text-naf-600 underline"
                            >
                              {f.name || "ملف"}
                            </a>
                          ))}
                        </span>
                      ) : c.url ? (
                        <a href={c.url} target="_blank" className="text-naf-600 underline">
                          {c.text || "عرض الملف"}
                        </a>
                      ) : c.loc ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${c.loc.lat}&mlon=${c.loc.lng}#map=15/${c.loc.lat}/${c.loc.lng}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-naf-600 underline"
                        >
                          <Icon name="map-pin" className="h-3.5 w-3.5" /> {c.text}
                        </a>
                      ) : (
                        c.text || <span className="text-slate-300">—</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* مراجعة الرد: الحالة والتقييم والملاحظات الداخلية */}
              <ReviewBar
                review={reviewOf(r.id)}
                onChange={(patch) => saveReview(r.id, patch)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-naf-50 text-naf-600">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-lg font-extrabold">{value}</div>
      </div>
    </div>
  );
}

function StatBlock({ q }: { q: QuestionStat }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">{q.label}</h3>
        <span className="text-xs text-slate-400">{q.answered} إجابة</span>
      </div>

      {(q.kind === "distribution" || q.kind === "numeric") && q.buckets && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {q.kind === "distribution" && q.answered > 0 && (
            <Donut data={q.buckets} />
          )}
          <div className="flex-1 space-y-2">
            {q.average != null && (
              <p className="mb-2 text-sm text-slate-500">
                المتوسط: <span className="font-bold text-naf-700">{q.average.toFixed(2)}</span>
              </p>
            )}
            {q.buckets.map((b) => (
              <Bar key={b.label} label={b.label} count={b.count} total={q.answered} />
            ))}
          </div>
        </div>
      )}

      {q.kind === "grid" && q.gridRows && (
        <div className="space-y-3">
          {q.gridRows.map((gr) => (
            <div key={gr.row}>
              <p className="mb-1 text-sm font-medium">{gr.row}</p>
              <div className="space-y-1">
                {gr.cols.map((c) => (
                  <Bar key={c.label} label={c.label} count={c.count} total={q.answered} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(q.kind === "text" || q.kind === "file" || q.kind === "location") && (
        <div className="space-y-1.5">
          {q.samples && q.samples.length > 0 ? (
            q.samples.map((s, i) => (
              <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {s.url ? (
                  <a href={s.url} target="_blank" className="text-naf-600 underline">
                    {s.text}
                  </a>
                ) : (
                  s.text
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">لا توجد إجابات</p>
          )}
        </div>
      )}
    </div>
  );
}

const PIE_COLORS = [
  "#5566a6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function Donut({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = data
    .filter((d) => d.count > 0)
    .map((d, i) => {
      const frac = d.count / total;
      const seg = {
        color: PIE_COLORS[i % PIE_COLORS.length],
        dash: frac * C,
        gap: C - frac * C,
        offset: -offset * C,
        label: d.label,
        pct: Math.round(frac * 100),
      };
      offset += frac;
      return seg;
    });
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        {segments.map((s, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.offset}
          />
        ))}
      </svg>
      <div className="space-y-0.5 text-xs">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="max-w-[120px] truncate">{s.label}</span>
            <span className="text-slate-400">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// جدول تقاطعي: توزيع الإجابات بين سؤالي اختيار (لتحليل العلاقة بينهما)
function CrossTab({
  stats,
  rows,
}: {
  stats: QuestionStat[];
  rows: ResponseRow[];
}) {
  const choice = stats.filter((s) => s.kind === "distribution");
  const [aId, setAId] = useState(choice[0]?.id || "");
  const [bId, setBId] = useState(choice[1]?.id || "");
  if (choice.length < 2) return null;

  const qa = choice.find((c) => c.id === aId);
  const qb = choice.find((c) => c.id === bId);
  if (!qa || !qb || aId === bId)
    return (
      <div className="card p-5">
        <CrossHead
          choice={choice}
          aId={aId}
          bId={bId}
          setAId={setAId}
          setBId={setBId}
        />
        <p className="mt-3 text-sm text-slate-400">اختر سؤالين مختلفين.</p>
      </div>
    );

  // القيم المحتملة لكل سؤال من نتائج التحليل نفسها
  const aVals = (qa.buckets || []).map((b) => b.label);
  const bVals = (qb.buckets || []).map((b) => b.label);

  // نقرأ نص الخلية ونفصل الاختيارات المتعددة
  const valuesOf = (r: ResponseRow, label: string) => {
    const cell = r.cells.find((c) => c.label === label);
    if (!cell?.text) return [];
    return cell.text.split("، ").map((s) => s.trim()).filter(Boolean);
  };

  const matrix: Record<string, Record<string, number>> = {};
  for (const av of aVals) matrix[av] = Object.fromEntries(bVals.map((b) => [b, 0]));
  for (const r of rows) {
    for (const av of valuesOf(r, qa.label)) {
      if (!matrix[av]) continue;
      for (const bv of valuesOf(r, qb.label)) {
        if (matrix[av][bv] === undefined) continue;
        matrix[av][bv]++;
      }
    }
  }
  const colTotal = (bv: string) =>
    aVals.reduce((s, av) => s + (matrix[av]?.[bv] || 0), 0);
  const rowTotal = (av: string) =>
    bVals.reduce((s, bv) => s + (matrix[av]?.[bv] || 0), 0);
  const grand = aVals.reduce((s, av) => s + rowTotal(av), 0);

  return (
    <div className="card p-5">
      <CrossHead
        choice={choice}
        aId={aId}
        bId={bId}
        setAId={setAId}
        setBId={setBId}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">
            جدول تقاطعي بين «{qa.label}» و«{qb.label}»
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-right text-xs text-slate-400">
                {qa.label} / {qb.label}
              </th>
              {bVals.map((bv) => (
                <th key={bv} scope="col" className="p-2 text-xs font-medium text-slate-600">
                  {bv}
                </th>
              ))}
              <th scope="col" className="p-2 text-xs text-slate-400">
                المجموع
              </th>
            </tr>
          </thead>
          <tbody>
            {aVals.map((av, i) => (
              <tr key={av} className={i % 2 ? "bg-slate-50/60" : ""}>
                <th scope="row" className="p-2 text-right text-sm font-medium text-slate-700">
                  {av}
                </th>
                {bVals.map((bv) => {
                  const n = matrix[av]?.[bv] || 0;
                  return (
                    <td key={bv} className="p-2 text-center">
                      <span
                        className={
                          n > 0 ? "font-semibold text-naf-700" : "text-slate-300"
                        }
                      >
                        {n}
                      </span>
                    </td>
                  );
                })}
                <td className="p-2 text-center text-slate-500">{rowTotal(av)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200">
              <th scope="row" className="p-2 text-right text-xs text-slate-400">
                المجموع
              </th>
              {bVals.map((bv) => (
                <td key={bv} className="p-2 text-center text-slate-500">
                  {colTotal(bv)}
                </td>
              ))}
              <td className="p-2 text-center font-bold">{grand}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CrossHead({
  choice,
  aId,
  bId,
  setAId,
  setBId,
}: {
  choice: QuestionStat[];
  aId: string;
  bId: string;
  setAId: (v: string) => void;
  setBId: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="flex items-center gap-2 font-bold">
        <Icon name="grid" className="h-5 w-5 text-naf-600" /> جدول تقاطعي
      </h3>
      <div className="ms-auto flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="crosstab-a">
          السؤال الأول
        </label>
        <select
          id="crosstab-a"
          className="input py-1 text-xs"
          value={aId}
          onChange={(e) => setAId(e.target.value)}
        >
          {choice.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">×</span>
        <label className="sr-only" htmlFor="crosstab-b">
          السؤال الثاني
        </label>
        <select
          id="crosstab-b"
          className="input py-1 text-xs"
          value={bId}
          onChange={(e) => setBId(e.target.value)}
        >
          {choice.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// مراجعة الرد: حالة + تقييم بالنجوم + ملاحظات داخلية (تُحفظ تلقائيًا)
function ReviewBar({
  review,
  onChange,
}: {
  review: { status: string; rating: number; notes: string };
  onChange: (patch: Partial<{ status: string; rating: number; notes: string }>) => void;
}) {
  const [notes, setNotes] = useState(review.notes);
  const [openNotes, setOpenNotes] = useState(!!review.notes);
  const [savedAt, setSavedAt] = useState("");

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">الحالة</span>
          <select
            className="input py-1 text-sm"
            value={review.status}
            onChange={(e) => onChange({ status: e.target.value })}
          >
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REVIEW_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">التقييم</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              title={`${n} من 5`}
              onClick={() => onChange({ rating: review.rating === n ? 0 : n })}
              className={
                n <= review.rating ? "text-amber-500" : "text-slate-300"
              }
            >
              <Icon name="star" className="h-4 w-4" />
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpenNotes((o) => !o)}
          className="inline-flex items-center gap-1 text-xs font-medium text-naf-600 hover:underline"
        >
          <Icon name="edit" className="h-3.5 w-3.5" />
          {openNotes ? "إخفاء الملاحظات" : "ملاحظات داخلية"}
        </button>
        {savedAt && <span className="text-xs text-green-600">حُفظ</span>}
      </div>

      {openNotes && (
        <textarea
          className="input mt-2 text-sm"
          rows={3}
          placeholder="ملاحظات داخلية (لا تظهر للمستفيد)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== review.notes) {
              onChange({ notes });
              setSavedAt(new Date().toLocaleTimeString("ar-SA"));
            }
          }}
        />
      )}
    </div>
  );
}

// تحليلات الإكمال: معدّل الإكمال، زمن التعبئة، ونقاط التسرّب
function FunnelPanel({ funnel }: { funnel: FunnelStats }) {
  if (!funnel.started)
    return (
      <div className="card p-5 text-sm text-slate-400">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-slate-700">
          <Icon name="target" className="h-5 w-5 text-naf-600" /> تحليلات الإكمال
        </h3>
        لم تُسجَّل محاولات تعبئة بعد. تُحتسب من لحظة ضغط «البدء» في النماذج
        المنشورة.
      </div>
    );

  const dur = (s: number | null) => {
    if (s == null) return "—";
    const m = Math.floor(s / 60);
    return m > 0 ? `${m} د ${s % 60} ث` : `${s} ث`;
  };
  const maxDrop = Math.max(1, ...funnel.dropOff.map((d) => d.count));

  return (
    <div className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold">
        <Icon name="target" className="h-5 w-5 text-naf-600" /> تحليلات الإكمال
      </h3>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="بدأوا التعبئة" value={String(funnel.started)} />
        <Metric label="أكملوا" value={String(funnel.completed)} />
        <Metric
          label="معدّل الإكمال"
          value={funnel.rate == null ? "—" : `${funnel.rate}%`}
        />
        <Metric label="متوسط زمن التعبئة" value={dur(funnel.avgSeconds)} />
      </div>

      {funnel.rate != null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-naf-600"
            style={{ width: `${funnel.rate}%` }}
          />
        </div>
      )}

      {funnel.dropOff.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            نقاط التسرّب — آخر سؤال وُصل إليه دون إكمال
          </p>
          <div className="space-y-1.5">
            {funnel.dropOff.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-40 shrink-0 truncate text-slate-600">
                  {d.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(d.count / maxDrop) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-left text-xs text-slate-500">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold">{value}</div>
    </div>
  );
}

function TimelineChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold">
        <Icon name="trend-up" className="h-5 w-5 text-naf-600" /> الردود عبر الزمن
      </h3>
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ height: 140 }}>
        {data.map((d) => (
          <div key={d.label} className="flex min-w-[28px] flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-bold text-naf-700">{d.count}</span>
            <div
              className="w-full rounded-t-md bg-naf-500"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0 }}
            />
            <span className="whitespace-nowrap text-[10px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-xs">
        <span className="truncate">{label}</span>
        <span className="text-slate-400">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-naf-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
