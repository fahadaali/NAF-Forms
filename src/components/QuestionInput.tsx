"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import StarRating from "./StarRating";
import type { QuestionDTO } from "@/lib/types";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-64 place-items-center rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-400">
      جارٍ تحميل الخريطة…
    </div>
  ),
});

const OTHER = "__other__";

export default function QuestionInput({
  question,
  value,
  onChange,
  accent = "#44528a",
}: {
  question: QuestionDTO;
  value: any;
  onChange: (v: any) => void;
  accent?: string;
}) {
  const cfg = question.config || {};
  const style = { accentColor: accent } as React.CSSProperties;

  switch (question.type) {
    case "PARAGRAPH":
      return (
        <textarea
          className="input min-h-32 resize-y"
          placeholder={cfg.placeholder || "اكتب إجابتك هنا…"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "NUMBER":
      return (
        <input
          type="number"
          className="input"
          min={cfg.min ?? undefined}
          max={cfg.max ?? undefined}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "PHONE":
      return (
        <input
          type="tel"
          dir="ltr"
          inputMode="tel"
          className="input text-right"
          placeholder={cfg.placeholder || "05xxxxxxxx"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "EMAIL":
      return (
        <input
          type="email"
          dir="ltr"
          className="input text-right"
          placeholder={cfg.placeholder || "name@example.com"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "DATE":
      return (
        <input
          type="date"
          className="input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "MULTIPLE_CHOICE":
    case "DROPDOWN": {
      const options: string[] = cfg.options || [];
      if (question.type === "DROPDOWN") {
        return (
          <select
            className="input"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">— اختر —</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      }
      const isOther = value && !options.includes(value) ? value : "";
      return (
        <div className="space-y-2.5">
          {options.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 has-[:checked]:border-naf-400 has-[:checked]:bg-naf-50"
            >
              <input
                type="radio"
                style={style}
                className="h-4 w-4"
                checked={value === o}
                onChange={() => onChange(o)}
              />
              <span className="text-sm">{o}</span>
            </label>
          ))}
          {cfg.allowOther && (
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 has-[:checked]:border-naf-400 has-[:checked]:bg-naf-50">
              <input
                type="radio"
                style={style}
                className="h-4 w-4"
                checked={!!isOther}
                onChange={() => onChange("")}
              />
              <span className="text-sm">أخرى:</span>
              <input
                type="text"
                className="input flex-1 py-1.5"
                value={isOther}
                onChange={(e) => onChange(e.target.value)}
              />
            </label>
          )}
        </div>
      );
    }

    case "CHECKBOXES": {
      const options: string[] = cfg.options || [];
      const arr: string[] = Array.isArray(value) ? value : [];
      const toggle = (o: string) =>
        onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
      return (
        <div className="space-y-2.5">
          {options.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 has-[:checked]:border-naf-400 has-[:checked]:bg-naf-50"
            >
              <input
                type="checkbox"
                style={style}
                className="h-4 w-4 rounded"
                checked={arr.includes(o)}
                onChange={() => toggle(o)}
              />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      );
    }

    case "LINEAR_SCALE": {
      const min = Number(cfg.min ?? 1);
      const max = Number(cfg.max ?? 5);
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {nums.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`h-12 w-12 rounded-full border text-sm font-bold transition ${
                  value === n
                    ? "border-naf-500 bg-naf-600 text-white"
                    : "border-slate-300 bg-white hover:border-naf-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>{cfg.minLabel}</span>
            <span>{cfg.maxLabel}</span>
          </div>
        </div>
      );
    }

    case "RATING":
      return (
        <StarRating
          value={Number(value) || 0}
          max={Number(cfg.max ?? 5)}
          onChange={onChange}
        />
      );

    case "GRID": {
      const rows: string[] = cfg.rows || [];
      const cols: string[] = cfg.cols || [];
      const multi = !!cfg.multi;
      const grid: Record<string, any> = value && typeof value === "object" ? value : {};
      const setCell = (row: string, col: string) => {
        if (multi) {
          const cur: string[] = Array.isArray(grid[row]) ? grid[row] : [];
          const next = cur.includes(col)
            ? cur.filter((c) => c !== col)
            : [...cur, col];
          onChange({ ...grid, [row]: next });
        } else {
          onChange({ ...grid, [row]: col });
        }
      };
      const checked = (row: string, col: string) =>
        multi ? (grid[row] || []).includes(col) : grid[row] === col;
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-center text-sm">
            <thead>
              <tr>
                <th></th>
                {cols.map((c) => (
                  <th key={c} className="p-2 text-xs font-medium text-slate-600">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r} className={i % 2 ? "bg-slate-50/60" : ""}>
                  <td className="p-2 text-right text-sm font-medium text-slate-700">
                    {r}
                  </td>
                  {cols.map((c) => (
                    <td key={c} className="p-2">
                      <input
                        type={multi ? "checkbox" : "radio"}
                        name={`grid-${question.id}-${r}`}
                        style={style}
                        className="h-4 w-4"
                        checked={checked(r, c)}
                        onChange={() => setCell(r, c)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "ADDRESS": {
      const fields: string[] = cfg.fields || [];
      const obj: Record<string, string> =
        value && typeof value === "object" ? value : {};
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <input
              key={f}
              className="input"
              placeholder={f}
              value={obj[f] || ""}
              onChange={(e) => onChange({ ...obj, [f]: e.target.value })}
            />
          ))}
        </div>
      );
    }

    case "LOCATION":
      return (
        <MapPicker
          value={value && typeof value === "object" ? value : null}
          defaultCenter={{ lat: cfg.lat ?? 24.7136, lng: cfg.lng ?? 46.6753 }}
          zoom={cfg.zoom ?? 5}
          onChange={onChange}
        />
      );

    case "TIME":
      return (
        <input
          type="time"
          className="input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "SLIDER":
      return <SliderField cfg={cfg} value={value} onChange={onChange} style={style} />;

    case "RANKING": {
      const opts: string[] = cfg.options || [];
      const ordered: string[] = Array.isArray(value) && value.length ? value : opts;
      const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= ordered.length) return;
        const copy = [...ordered];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        onChange(copy);
      };
      return (
        <div className="space-y-2">
          {ordered.map((o, i) => (
            <div
              key={o}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-naf-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="flex-1 text-sm">{o}</span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === ordered.length - 1}
                className="rounded px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      );
    }

    case "IMAGE_CHOICE": {
      const opts: { label: string; url: string }[] = cfg.options || [];
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {opts.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => onChange(o.label)}
              className={`overflow-hidden rounded-xl border-2 text-center transition ${
                value === o.label ? "border-naf-500 ring-2 ring-naf-200" : "border-slate-200"
              }`}
            >
              {o.url ? (
                <img src={o.url} alt={o.label} className="h-28 w-full object-cover" />
              ) : (
                <div className="grid h-28 w-full place-items-center bg-slate-100 text-3xl">🖼️</div>
              )}
              <div className="truncate p-2 text-sm">{o.label}</div>
            </button>
          ))}
        </div>
      );
    }

    case "SIGNATURE":
      return <SignaturePad value={value} onChange={onChange} />;

    case "FILE":
      return <FileField question={question} value={value} onChange={onChange} />;

    case "SHORT_TEXT":
    default:
      return (
        <input
          type="text"
          className="input"
          placeholder={cfg.placeholder || "اكتب إجابتك هنا…"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function SliderField({
  cfg,
  value,
  onChange,
  style,
}: {
  cfg: Record<string, any>;
  value: any;
  onChange: (v: any) => void;
  style: React.CSSProperties;
}) {
  const min = Number(cfg.min ?? 0);
  const max = Number(cfg.max ?? 100);
  const step = Number(cfg.step ?? 1);
  const mid = Math.round((min + max) / 2);
  // تسجيل القيمة الابتدائية حتى يُحتسب السؤال ولو لم يحرّك المستخدم المؤشر
  useEffect(() => {
    if (value === "" || value === undefined || value === null) onChange(mid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const val = value === "" || value === undefined || value === null ? mid : Number(value);
  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        style={style}
        className="w-full"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span className="rounded-lg bg-naf-50 px-2 py-0.5 font-bold text-naf-700">{val}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function SignaturePad({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  function pos(e: React.PointerEvent) {
    const c = ref.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent) {
    drawing.current = true;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function draw(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  }
  function clear() {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={ref}
        width={500}
        height={180}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
        style={{ touchAction: "none" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">وقّع بالماوس أو الإصبع داخل الإطار</span>
        <button type="button" onClick={clear} className="text-sm text-red-500 hover:underline">
          مسح
        </button>
      </div>
      {value && (
        <p className="mt-1 text-xs text-green-600">✓ تم التوقيع</p>
      )}
    </div>
  );
}

function FileField({
  question,
  value,
  onChange,
}: {
  question: QuestionDTO;
  value: any;
  onChange: (v: any) => void;
}) {
  const cfg = question.config || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    const maxMB = Number(cfg.maxSizeMB ?? 10);
    if (file.size > maxMB * 1024 * 1024) {
      setError(`الحد الأقصى ${maxMB} ميجابايت`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onChange({ name: file.name, url: data.url, size: file.size });
    } catch {
      setError("تعذّر رفع الملف");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-naf-400 hover:bg-naf-50">
        <span className="text-3xl">📎</span>
        <span className="text-sm font-medium text-slate-700">
          {busy ? "جارٍ الرفع…" : "اضغط لرفع ملف"}
        </span>
        <span className="text-xs text-slate-400">
          {cfg.accept} — حتى {cfg.maxSizeMB ?? 10}MB
        </span>
        <input
          type="file"
          className="hidden"
          accept={cfg.accept}
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {value?.url && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm">
          <span className="truncate text-green-800">✓ {value.name}</span>
          <a
            href={value.url}
            target="_blank"
            className="text-naf-600 hover:underline"
          >
            عرض
          </a>
        </div>
      )}
    </div>
  );
}
