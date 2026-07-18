"use client";
import { fieldType } from "@/lib/field-types";
import type { QuestionDTO } from "@/lib/types";
import OptionsEditor from "./OptionsEditor";
import ImageOptionsEditor from "./ImageOptionsEditor";

export default function QuestionEditor({
  q,
  index,
  total,
  formType,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  onDragStartItem,
  onDropItem,
  priorQuestions,
}: {
  q: QuestionDTO;
  index: number;
  total: number;
  formType: string;
  onChange: (patch: Partial<QuestionDTO>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDragStartItem: () => void;
  onDropItem: () => void;
  priorQuestions: { id: string; label: string; type: string }[];
}) {
  const def = fieldType(q.type);
  const cfg = q.config || {};
  const setCfg = (patch: Record<string, any>) =>
    onChange({ config: { ...cfg, ...patch } });

  if (q.type === "SECTION") {
    return (
      <div
        className="card border-r-4 border-r-naf-400 p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropItem}
      >
        <Toolbar
          def={def}
          index={index}
          total={total}
          required={false}
          showRequired={false}
          onMove={onMove}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onDragStartItem={onDragStartItem}
          onToggleRequired={() => {}}
        />
        <input
          className="input mt-3 text-lg font-bold"
          placeholder="عنوان القسم"
          value={q.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <textarea
          className="input mt-2 text-sm"
          placeholder="نص توضيحي (اختياري)"
          value={q.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div
      className="card p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropItem}
    >
      <Toolbar
        def={def}
        index={index}
        total={total}
        required={q.required}
        showRequired
        onMove={onMove}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onDragStartItem={onDragStartItem}
        onToggleRequired={() => onChange({ required: !q.required })}
      />

      <div className="mt-3 flex items-start gap-1">
        <input
          className="input text-base font-semibold"
          placeholder="نص السؤال"
          value={q.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        {q.required && <span className="mt-2 text-lg text-red-500">*</span>}
      </div>
      <textarea
        className="input mt-2 text-sm"
        placeholder="وصف / تعليمات (اختياري)"
        rows={1}
        value={q.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />

      {/* إعدادات حسب النوع */}
      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
        {(q.type === "MULTIPLE_CHOICE" ||
          q.type === "CHECKBOXES" ||
          q.type === "DROPDOWN") && (
          <>
            <OptionsEditor
              options={cfg.options || []}
              onChange={(options) => setCfg({ options })}
            />
            {q.type !== "DROPDOWN" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!cfg.allowOther}
                  onChange={(e) => setCfg({ allowOther: e.target.checked })}
                />
                السماح بخيار «أخرى»
              </label>
            )}
          </>
        )}

        {q.type === "LINEAR_SCALE" && (
          <div className="grid grid-cols-2 gap-3">
            <NumField label="من" value={cfg.min ?? 1} onChange={(v) => setCfg({ min: v })} />
            <NumField label="إلى" value={cfg.max ?? 5} onChange={(v) => setCfg({ max: v })} />
            <TextField
              label="تسمية الأدنى"
              value={cfg.minLabel || ""}
              onChange={(v) => setCfg({ minLabel: v })}
            />
            <TextField
              label="تسمية الأعلى"
              value={cfg.maxLabel || ""}
              onChange={(v) => setCfg({ maxLabel: v })}
            />
          </div>
        )}

        {q.type === "RATING" && (
          <NumField
            label="عدد النجوم"
            value={cfg.max ?? 5}
            onChange={(v) => setCfg({ max: v })}
          />
        )}

        {q.type === "SLIDER" && (
          <div className="grid grid-cols-3 gap-3">
            <NumField label="من" value={cfg.min ?? 0} onChange={(v) => setCfg({ min: v })} />
            <NumField label="إلى" value={cfg.max ?? 100} onChange={(v) => setCfg({ max: v })} />
            <NumField label="الخطوة" value={cfg.step ?? 1} onChange={(v) => setCfg({ step: v })} />
          </div>
        )}

        {q.type === "RANKING" && (
          <OptionsEditor
            label="العناصر المراد ترتيبها"
            options={cfg.options || []}
            onChange={(options) => setCfg({ options })}
          />
        )}

        {q.type === "IMAGE_CHOICE" && (
          <ImageOptionsEditor
            options={cfg.options || []}
            onChange={(options) => setCfg({ options })}
          />
        )}

        {q.type === "GRID" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <OptionsEditor
              label="الصفوف (العناصر)"
              options={cfg.rows || []}
              onChange={(rows) => setCfg({ rows })}
            />
            <OptionsEditor
              label="الأعمدة (الخيارات)"
              options={cfg.cols || []}
              onChange={(cols) => setCfg({ cols })}
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={!!cfg.multi}
                onChange={(e) => setCfg({ multi: e.target.checked })}
              />
              السماح باختيارات متعددة في كل صف
            </label>
          </div>
        )}

        {q.type === "ADDRESS" && (
          <OptionsEditor
            label="حقول العنوان"
            options={cfg.fields || []}
            onChange={(fields) => setCfg({ fields })}
          />
        )}

        {q.type === "FILE" && (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="الصيغ المسموحة"
              value={cfg.accept || ""}
              onChange={(v) => setCfg({ accept: v })}
            />
            <NumField
              label="الحد الأقصى (MB)"
              value={cfg.maxSizeMB ?? 10}
              onChange={(v) => setCfg({ maxSizeMB: v })}
            />
          </div>
        )}

        {q.type === "LOCATION" && (
          <p className="text-xs text-slate-400">
            سيحدد المستفيد الموقع بالنقر على الخريطة عند التعبئة.
          </p>
        )}

        {(q.type === "SHORT_TEXT" ||
          q.type === "PARAGRAPH" ||
          q.type === "PHONE" ||
          q.type === "EMAIL") && (
          <TextField
            label="نص إرشادي (placeholder)"
            value={cfg.placeholder || ""}
            onChange={(v) => setCfg({ placeholder: v })}
          />
        )}

        {/* إجابة صحيحة للاختبارات */}
        {formType === "EXAM" && def?.gradable && (
          <div className="rounded-xl bg-amber-50 p-3">
            <label className="label text-amber-800">الإجابة الصحيحة (اختبار)</label>
            {/* تطبيع الخيارات: نصوص عادية أو كائنات {label} لحقل الاختيار بالصور */}
            {(() => {
              const opts: string[] = (cfg.options || []).map((o: any) =>
                typeof o === "string" ? o : o.label
              );
              return q.type === "CHECKBOXES" ? (
              <div className="space-y-1.5">
                {opts.map((o: string) => {
                  const arr: string[] = Array.isArray(cfg.correctAnswer)
                    ? cfg.correctAnswer
                    : [];
                  return (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={arr.includes(o)}
                        onChange={(e) =>
                          setCfg({
                            correctAnswer: e.target.checked
                              ? [...arr, o]
                              : arr.filter((x) => x !== o),
                          })
                        }
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            ) : opts.length ? (
              <select
                className="input"
                value={cfg.correctAnswer || ""}
                onChange={(e) => setCfg({ correctAnswer: e.target.value })}
              >
                <option value="">— لا شيء —</option>
                {opts.map((o: string) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder="الإجابة الصحيحة"
                value={cfg.correctAnswer || ""}
                onChange={(e) => setCfg({ correctAnswer: e.target.value })}
              />
            );
            })()}
            <div className="mt-2 w-32">
              <NumField
                label="الدرجة"
                value={cfg.points ?? 1}
                onChange={(v) => setCfg({ points: v })}
              />
            </div>
          </div>
        )}

        {/* منطق شرطي */}
        {priorQuestions.length > 0 && (
          <LogicEditor
            logic={cfg.logic}
            priorQuestions={priorQuestions}
            onChange={(logic) => setCfg({ logic })}
          />
        )}
      </div>
    </div>
  );
}

function LogicEditor({
  logic,
  priorQuestions,
  onChange,
}: {
  logic: any;
  priorQuestions: { id: string; label: string; type: string }[];
  onChange: (logic: any) => void;
}) {
  const enabled = !!(logic && logic.whenQuestionId);
  const src = priorQuestions.find((p) => p.id === logic?.whenQuestionId);
  const srcConfig = src as any;
  return (
    <div className="rounded-xl bg-indigo-50/60 p-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? {
                    whenQuestionId: priorQuestions[0].id,
                    operator: "eq",
                    value: "",
                  }
                : undefined
            )
          }
        />
        🔀 إظهار هذا السؤال بشرط
      </label>
      {enabled && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select
            className="input py-1.5"
            value={logic.whenQuestionId}
            onChange={(e) => onChange({ ...logic, whenQuestionId: e.target.value })}
          >
            {priorQuestions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label || "سؤال بلا عنوان"}
              </option>
            ))}
          </select>
          <select
            className="input py-1.5"
            value={logic.operator}
            onChange={(e) => onChange({ ...logic, operator: e.target.value })}
          >
            <option value="eq">يساوي</option>
            <option value="neq">لا يساوي</option>
            <option value="contains">يتضمّن</option>
          </select>
          <input
            className="input py-1.5"
            placeholder="القيمة"
            value={logic.value || ""}
            onChange={(e) => onChange({ ...logic, value: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

function Toolbar({
  def,
  index,
  total,
  required,
  showRequired,
  onMove,
  onRemove,
  onDuplicate,
  onDragStartItem,
  onToggleRequired,
}: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5">
        <span
          draggable
          onDragStart={onDragStartItem}
          className="cursor-grab select-none text-slate-400 active:cursor-grabbing"
          title="اسحب لإعادة الترتيب"
        >
          ⠿
        </span>
        <span className="chip bg-slate-100 text-slate-600">
          {def?.icon} {def?.label} · سؤال {index + 1}
        </span>
      </span>
      <div className="flex items-center gap-1">
        {showRequired && (
          <button
            onClick={onToggleRequired}
            className={`rounded-lg px-2 py-1 text-xs font-medium ${
              required
                ? "bg-red-50 text-red-600"
                : "text-slate-500 hover:bg-slate-100"
            }`}
            title="إلزامي"
          >
            {required ? "★ إلزامي" : "☆ اختياري"}
          </button>
        )}
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          ↓
        </button>
        <button
          onClick={onDuplicate}
          className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          title="نسخ السؤال"
        >
          📄
        </button>
        <button
          onClick={onRemove}
          className="rounded-lg px-2 py-1 text-red-500 hover:bg-red-50"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input py-1.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
