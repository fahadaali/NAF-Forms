"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import StarRating from "./StarRating";
import { Icon } from "@/components/ui/Icon";
import type { QuestionDTO } from "@/lib/types";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-64 place-items-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
      جارٍ تحميل الخريطة…
    </div>
  ),
});

export default function QuestionInput({
  question,
  value,
  onChange,
  accent = "#44528a",
  remaining,
}: {
  question: QuestionDTO;
  value: any;
  onChange: (v: any) => void;
  accent?: string;
  // المتبقي من حصة كل خيار (إن كانت الحصص مفعّلة لهذا السؤال)
  remaining?: Record<string, number>;
}) {
  const cfg = question.config || {};
  const style = { accentColor: accent } as React.CSSProperties;

  // هل الخيار مكتمل العدد؟ (لا يُعطَّل الخيار المُختار مسبقًا)
  const isFull = (option: string) =>
    !!remaining && remaining[option] !== undefined && remaining[option] <= 0;
  const quotaNote = (option: string) =>
    remaining && remaining[option] !== undefined
      ? remaining[option] <= 0
        ? " (اكتمل العدد)"
        : ` (متبقٍ ${remaining[option]})`
      : "";

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
      // نص + لوحة أرقام: نلتقط الإدخال غير الرقمي لنُظهر رسالة خطأ واضحة
      // بدل أن يتجاهله المتصفح بصمت (type=number).
      return (
        <input
          type="text"
          dir="ltr"
          inputMode="decimal"
          className="input text-right"
          placeholder={cfg.placeholder || "أدخل رقمًا"}
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
              <option key={o} value={o} disabled={isFull(o) && value !== o}>
                {o}
                {quotaNote(o)}
              </option>
            ))}
          </select>
        );
      }
      const isOther = value && !options.includes(value) ? value : "";
      return (
        <div className="space-y-2.5">
          {options.map((o) => {
            const full = isFull(o) && value !== o;
            return (
              <label
                key={o}
                className={`flex items-center gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-accent ${
                  full
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  style={style}
                  className="h-4 w-4"
                  disabled={full}
                  checked={value === o}
                  onChange={() => onChange(o)}
                />
                <span className="text-sm">
                  {o}
                  <span className="text-xs text-muted-foreground">{quotaNote(o)}</span>
                </span>
              </label>
            );
          })}
          {cfg.allowOther && (
            <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-accent">
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
          {options.map((o) => {
            const full = isFull(o) && !arr.includes(o);
            return (
              <label
                key={o}
                className={`flex items-center gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-accent ${
                  full
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-muted"
                }`}
              >
                <input
                  type="checkbox"
                  style={style}
                  className="h-4 w-4 rounded-sm"
                  disabled={full}
                  checked={arr.includes(o)}
                  onChange={() => toggle(o)}
                />
                <span className="text-sm">
                  {o}
                  <span className="text-xs text-muted-foreground">{quotaNote(o)}</span>
                </span>
              </label>
            );
          })}
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
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
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
                  <th key={c} className="p-2 text-xs font-medium text-muted-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r} className={i % 2 ? "bg-muted/60" : ""}>
                  <td className="p-2 text-right text-sm font-medium text-foreground">
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
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="flex-1 text-sm">{o}</span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded-sm px-2 text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === ordered.length - 1}
                className="rounded-sm px-2 text-muted-foreground hover:bg-muted disabled:opacity-30"
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
                value === o.label ? "border-primary ring-2 ring-ring" : "border-border"
              }`}
            >
              {o.url ? (
                <img src={o.url} alt={o.label} className="h-28 w-full object-cover" />
              ) : (
                <div className="grid h-28 w-full place-items-center bg-muted text-muted-foreground">
                  <Icon name="image" className="h-8 w-8" />
                </div>
              )}
              <div className="truncate p-2 text-sm">{o.label}</div>
            </button>
          ))}
        </div>
      );
    }

    case "CONSENT": {
      const statement = cfg.statement || "أوافق على الشروط والأحكام";
      return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3.5 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-accent">
          <input
            type="checkbox"
            style={style}
            className="mt-0.5 h-5 w-5 rounded-sm"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-sm">
            {statement}
            {cfg.linkUrl && (
              <>
                {" "}
                <a
                  href={cfg.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                  style={{ color: accent }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {cfg.linkLabel || "التفاصيل"}
                </a>
              </>
            )}
          </span>
        </label>
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
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span className="rounded-lg bg-accent px-2 py-0.5 font-bold text-primary">{val}</span>
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
        className="w-full touch-none rounded-xl border-2 border-dashed border-border bg-card"
        style={{ touchAction: "none" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">وقّع بالماوس أو الإصبع داخل الإطار</span>
        <button type="button" onClick={clear} className="text-sm text-destructive hover:underline">
          مسح
        </button>
      </div>
      {value && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
          <Icon name="check" className="h-3.5 w-3.5" /> تم التوقيع
        </p>
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

  const multiple = !!cfg.multiple;
  const maxFiles = Number(cfg.maxFiles ?? 5);
  // القيمة: كائن واحد في الوضع المفرد، ومصفوفة في وضع تعدّد الملفات
  const files: { name: string; url: string; size?: number }[] = multiple
    ? Array.isArray(value)
      ? value
      : value?.url
      ? [value]
      : []
    : value?.url
    ? [value]
    : [];

  async function uploadMany(list: File[]) {
    setError("");
    const maxMB = Number(cfg.maxSizeMB ?? 10);
    if (multiple && files.length + list.length > maxFiles) {
      setError(`يمكن رفع ${maxFiles} ملفات كحدّ أقصى`);
      return;
    }
    setBusy(true);
    try {
      const uploaded: { name: string; url: string; size: number }[] = [];
      for (const file of list) {
        if (file.size > maxMB * 1024 * 1024) {
          setError(`«${file.name}» يتجاوز ${maxMB} ميجابايت`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || "تعذّر رفع الملف");
          continue;
        }
        const data = await res.json();
        uploaded.push({ name: file.name, url: data.url, size: file.size });
      }
      if (!uploaded.length) return;
      onChange(multiple ? [...files, ...uploaded] : uploaded[0]);
    } catch {
      setError("تعذّر رفع الملف");
    } finally {
      setBusy(false);
    }
  }

  function removeAt(i: number) {
    if (!multiple) {
      onChange("");
      return;
    }
    const next = files.filter((_, k) => k !== i);
    onChange(next.length ? next : "");
  }

  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted px-6 py-8 text-center hover:border-primary hover:bg-accent">
        <Icon name="paperclip" className="h-7 w-7 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {busy
            ? "جارٍ الرفع…"
            : multiple
            ? "اضغط لرفع ملف أو أكثر"
            : "اضغط لرفع ملف"}
        </span>
        <span className="text-xs text-muted-foreground">
          {cfg.accept} — حتى {cfg.maxSizeMB ?? 10}MB
          {multiple ? ` · حتى ${maxFiles} ملفات` : ""}
        </span>
        <input
          type="file"
          className="hidden"
          accept={cfg.accept}
          multiple={multiple}
          disabled={busy}
          onChange={(e) => {
            const list = Array.from(e.target.files || []);
            if (list.length) uploadMany(list);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f, i) => (
            <div
              key={`${f.url}-${i}`}
              className="flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm"
            >
              <span className="inline-flex items-center gap-1 truncate text-success">
                <Icon name="check" className="h-3.5 w-3.5 shrink-0" /> {f.name}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <a href={f.url} target="_blank" className="text-primary hover:underline">
                  عرض
                </a>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="text-destructive hover:underline"
                >
                  إزالة
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
