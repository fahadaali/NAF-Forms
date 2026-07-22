"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
  cells: { label: string; type: string; text: string; url?: string; loc?: { lat: number; lng: number } }[];
}

export default function ResponsesDashboard({
  formId,
  formType,
  total,
  examAvg,
  stats,
  rows,
  timeline,
}: {
  formId: string;
  formType: string;
  total: number;
  examAvg: string | null;
  stats: QuestionStat[];
  rows: ResponseRow[];
  timeline: { label: string; count: number }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"summary" | "individual">("summary");
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filteredRows = rows.filter((r) => {
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
        <StatCard icon="📨" label="إجمالي الردود" value={String(total)} />
        <StatCard
          icon="⏱️"
          label="آخر رد"
          value={rows[0]?.submittedAt || "—"}
        />
        {formType === "EXAM" ? (
          <StatCard icon="🎯" label="متوسط الدرجات" value={examAvg || "—"} />
        ) : (
          <StatCard icon="❓" label="عدد الأسئلة" value={String(stats.length)} />
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
          <a className="btn-ghost py-1.5 text-sm" href={`/api/forms/${formId}/export?format=csv`}>
            ⬇️ CSV
          </a>
          <a className="btn-ghost py-1.5 text-sm" href={`/api/forms/${formId}/export?format=xlsx`}>
            ⬇️ Excel
          </a>
          <a className="btn-ghost py-1.5 text-sm" href={`/api/forms/${formId}/export?format=json`}>
            ⬇️ JSON
          </a>
        </div>
      </div>

      {total === 0 && (
        <div className="card grid place-items-center p-12 text-center text-slate-500">
          <span className="mb-2 text-4xl">📭</span>
          لا توجد ردود بعد.
        </div>
      )}

      {total > 0 && tab === "summary" && (
        <div className="space-y-4">
          {timeline.length > 1 && <TimelineChart data={timeline} />}
          {stats.map((q) => (
            <StatBlock key={q.id} q={q} />
          ))}
        </div>
      )}

      {total > 0 && tab === "individual" && (
        <div className="space-y-4">
          <input
            className="input"
            placeholder="🔍 بحث في الردود…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">من</span>
            <input type="date" className="input py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-slate-500">إلى</span>
            <input type="date" className="input py-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
            {(from || to || query) && (
              <button
                className="text-naf-600 hover:underline"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setQuery("");
                }}
              >
                مسح
              </button>
            )}
          </div>
          {(query || from || to) && (
            <p className="text-sm text-slate-400">
              {filteredRows.length} نتيجة من {rows.length}
            </p>
          )}
          {filteredRows.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-bold">رد #{rows.length - rows.indexOf(r)}</span>
                <div className="flex items-center gap-3">
                  {r.email && (
                    <span className="chip bg-slate-100 text-slate-600" dir="ltr">
                      ✉️ {r.email}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">🕓 {r.submittedAt}</span>
                  <a
                    href={`/forms/${formId}/responses/${r.id}/print`}
                    target="_blank"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    🖨️ طباعة
                  </a>
                  <button
                    onClick={() => deleteResponse(r.id)}
                    disabled={busy === r.id}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === r.id ? "…" : "🗑 حذف"}
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
                      {c.url ? (
                        <a href={c.url} target="_blank" className="text-naf-600 underline">
                          {c.text || "عرض الملف"}
                        </a>
                      ) : c.loc ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${c.loc.lat}&mlon=${c.loc.lng}#map=15/${c.loc.lat}/${c.loc.lng}`}
                          target="_blank"
                          className="text-naf-600 underline"
                        >
                          📍 {c.text}
                        </a>
                      ) : (
                        c.text || <span className="text-slate-300">—</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
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
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-naf-50 text-2xl">{icon}</span>
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

function TimelineChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-bold">📈 الردود عبر الزمن</h3>
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
