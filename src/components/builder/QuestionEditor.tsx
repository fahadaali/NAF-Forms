"use client";
import { useState } from "react";
import { fieldType } from "@/lib/field-types";
import type { QuestionDTO } from "@/lib/types";
import OptionsEditor from "./OptionsEditor";
import ImageOptionsEditor from "./ImageOptionsEditor";
import { Icon, IconTip, fieldIcon } from "@/components/ui/Icon";
import { bidi } from "@/lib/utils";
import { Input, inputVariants } from "@/components/ui/input";

export default function QuestionEditor({
  q,
  index,
  total,
  formType,
  selected,
  onSelect,
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
  selected: boolean;
  onSelect: () => void;
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
  const [settingsOpen, setLocalOpen] = useState(false);

  // ===== فاصل بطاقة =====
  if (q.type === "PAGE_BREAK") {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropItem}
        className="group flex items-center gap-3 py-1"
      >
        <span
          draggable
          onDragStart={onDragStartItem}
          className="flex cursor-grab select-none items-center text-muted-foreground active:cursor-grabbing"
        >
          <Icon name="grip" className="h-4 w-4" />
        </span>
        <div className="flex flex-1 items-center gap-2">
          <span className="h-px flex-1 border-t border-dashed border-border" />
          <span className="chip inline-flex items-center gap-1.5 bg-accent text-primary">
            <Icon name="page-break" className="h-4 w-4" />
            فاصل بطاقة — بداية بطاقة جديدة
          </span>
          <span className="h-px flex-1 border-t border-dashed border-border" />
        </div>
        <ToolBtn label="نسخ" icon="copy" onClick={onDuplicate} />
        <ToolBtn label="حذف" icon="trash" onClick={onRemove} className="text-destructive" />
      </div>
    );
  }

  const isSection = q.type === "SECTION";
  const isMedia = q.type === "IMAGE" || q.type === "VIDEO";
  const isLayout = isSection || isMedia;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropItem}
      className={`group relative rounded-xl border bg-card transition ${
        selected
          ? "border-primary shadow-md ring-1 ring-ring"
          : "border-border hover:border-border hover:shadow-sm"
      } ${isSection ? "border-s-4 border-s-primary" : ""}`}
    >
      {/* شريط الأدوات (يظهر عند التحويم أو التحديد) */}
      <div
        className={`absolute -top-3 end-3 flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5 shadow-sm transition ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {!isLayout && (
          <ToolBtn
            label={q.required ? "إلزامي (اضغط لجعله اختياري)" : "اجعله إلزاميًا"}
            icon="asterisk"
            onClick={() => onChange({ required: !q.required })}
            className={q.required ? "text-destructive" : "text-muted-foreground"}
          />
        )}
        <ToolBtn
          label="نقل لأعلى"
          icon="chevron-up"
          onClick={() => onMove(-1)}
          disabled={index === 0}
        />
        <ToolBtn
          label="نقل لأسفل"
          icon="chevron-down"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
        />
        <ToolBtn label="نسخ" icon="copy" onClick={onDuplicate} />
        <ToolBtn
          label="حذف"
          icon="trash"
          onClick={onRemove}
          className="text-destructive"
        />
        <IconTip label="اسحب لإعادة الترتيب">
          <span
            draggable
            onDragStart={onDragStartItem}
            className="flex cursor-grab select-none items-center px-1 text-muted-foreground active:cursor-grabbing"
          >
            <Icon name="grip" className="h-4 w-4" />
          </span>
        </IconTip>
      </div>

      <div className="p-5">
        {/* نوع العنصر */}
        <div className="mb-2 flex items-center gap-2">
          <span className="chip inline-flex items-center gap-1.5 bg-muted text-muted-foreground">
            <Icon name={fieldIcon(q.type)} className="h-4 w-4" />
            {def?.label}
          </span>
          {!isLayout && (
            <span className="text-xs text-muted-foreground">سؤال {index + 1}</span>
          )}
        </div>

        {/* عنوان العنصر */}
        <div className="flex items-start gap-1">
          <input
            className="w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-base font-semibold hover:border-border focus:border-primary focus:bg-card focus:outline-none"
            placeholder={
              isSection
                ? "عنوان القسم"
                : isMedia
                ? "عنوان (اختياري)"
                : "اكتب نص السؤال هنا"
            }
            value={q.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
          {!isLayout && q.required && (
            <span className="mt-2 text-lg text-destructive">*</span>
          )}
        </div>

        {/* وصف/تعليمات */}
        {(selected || q.description) && (
          <input
            className="mt-1 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm text-muted-foreground hover:border-border focus:border-primary focus:bg-card focus:outline-none"
            placeholder="وصف أو تعليمات (اختياري)"
            value={q.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        )}

        {/* معاينة حية للحقل */}
        {!isLayout && (
          <div className="pointer-events-none mt-3 select-none">
            <FieldPreview q={q} />
          </div>
        )}

        {/* محتوى القسم / الوسائط */}
        {isMedia && (
          <div className="mt-3 space-y-2">
            {q.type === "VIDEO" && (
              <TextField
                label="رابط يوتيوب"
                value={cfg.youtubeUrl || ""}
                onChange={(v) => setCfg({ youtubeUrl: v })}
              />
            )}
            <TextField
              label={
                q.type === "IMAGE"
                  ? "رابط الصورة (اختياري إن رفعت من الجهاز)"
                  : "رابط فيديو مباشر (mp4) — اختياري إن رفعت أو استخدمت يوتيوب"
              }
              value={cfg.url || ""}
              onChange={(v) => setCfg({ url: v })}
            />
            <MediaUploadButton
              kind={q.type as "IMAGE" | "VIDEO"}
              url={cfg.url || ""}
              onUploaded={(url) => setCfg({ url })}
            />
            <TextField
              label="تعليق أسفل الوسيط (اختياري)"
              value={cfg.caption || ""}
              onChange={(v) => setCfg({ caption: v })}
            />
          </div>
        )}

        {/* زرّ إظهار/إخفاء الإعدادات التفصيلية */}
        {hasSettings(q.type, formType, priorQuestions.length) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
              setLocalOpen((o) => !o);
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Icon name="gear" className="h-4 w-4" />
            {settingsOpen ? "إخفاء الخيارات" : "خيارات الحقل"}
          </button>
        )}

        {/* الإعدادات التفصيلية (مطويّة افتراضيًا) */}
        {settingsOpen && (
          <div
            className="mt-3 space-y-4 rounded-xl bg-muted p-4"
            onClick={(e) => e.stopPropagation()}
          >
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="الصيغ المسموحة"
                    value={cfg.accept || ""}
                    onChange={(v) => setCfg({ accept: v })}
                  />
                  <NumField
                    label="الحد الأقصى للملف (MB)"
                    value={cfg.maxSizeMB ?? 10}
                    onChange={(v) => setCfg({ maxSizeMB: v })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!cfg.multiple}
                    onChange={(e) => setCfg({ multiple: e.target.checked })}
                  />
                  السماح برفع عدة ملفات (سيرة + شهادات + هوية…)
                </label>
                {cfg.multiple && (
                  <div className="w-40">
                    <NumField
                      label="أقصى عدد ملفات"
                      value={cfg.maxFiles ?? 5}
                      onChange={(v) => setCfg({ maxFiles: v })}
                    />
                  </div>
                )}
              </div>
            )}

            {q.type === "CONSENT" && (
              <div className="space-y-3">
                <TextField
                  label="نص الموافقة"
                  value={cfg.statement || ""}
                  onChange={(v) => setCfg({ statement: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="نص الرابط (اختياري)"
                    value={cfg.linkLabel || ""}
                    onChange={(v) => setCfg({ linkLabel: v })}
                  />
                  <TextField
                    label="رابط الشروط (اختياري)"
                    value={cfg.linkUrl || ""}
                    onChange={(v) => setCfg({ linkUrl: v })}
                  />
                </div>
              </div>
            )}

            {(q.type === "SHORT_TEXT" ||
              q.type === "PARAGRAPH" ||
              q.type === "PHONE" ||
              q.type === "EMAIL" ||
              q.type === "NUMBER") && (
              <TextField
                label="نص إرشادي (placeholder)"
                value={cfg.placeholder || ""}
                onChange={(v) => setCfg({ placeholder: v })}
              />
            )}

            {/* حقل مخفي: يُملأ من الرابط أو بقيمة افتراضية */}
            {q.type === "HIDDEN" && (
              <div className="space-y-3">
                <TextField
                  label="اسم الوسيط في الرابط (مثال: source)"
                  value={cfg.paramName || ""}
                  onChange={(v) => setCfg({ paramName: v })}
                />
                <TextField
                  label="قيمة افتراضية إن لم تُرسل في الرابط"
                  value={cfg.defaultValue || ""}
                  onChange={(v) => setCfg({ defaultValue: v })}
                />
                <p className="text-xs text-muted-foreground">
                  إضافة <bdi>?{cfg.paramName || "source"}=value</bdi> إلى رابط
                  النموذج تُسجّل القيمة مع الرد دون إظهارها.
                </p>
              </div>
            )}

            {/* حصص الخيارات: حدّ لعدد مرات اختيار كل خيار */}
            {["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(q.type) && (
              <QuotasEditor
                options={cfg.options || []}
                quotas={cfg.quotas || {}}
                onChange={(quotas) => setCfg({ quotas })}
              />
            )}

            {/* التعبئة المسبقة من الرابط */}
            {!isLayout && q.type !== "HIDDEN" && (
              <TextField
                label="تعبئة مسبقة من الرابط — اسم الوسيط (اختياري)"
                value={cfg.prefillKey || ""}
                onChange={(v) => setCfg({ prefillKey: v })}
              />
            )}

            {/* إجابة صحيحة للاختبارات */}
            {formType === "EXAM" && def?.gradable && (
              <div className="rounded-xl bg-warning/10 p-3">
                <label className="label flex items-center gap-2 text-warning">
                  <Icon name="check-circle" className="h-4 w-4" />
                  الإجابة الصحيحة (اختبار)
                </label>
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
                      className={inputVariants()}
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
                    <Input
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

            {/* منطق شرطي (للأسئلة والأقسام) */}
            {priorQuestions.length > 0 && (
              <LogicEditor
                logic={cfg.logic}
                priorQuestions={priorQuestions}
                onChange={(logic) => setCfg({ logic })}
                sectionMode={isSection}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ملاحظة: الحالة المحلية للفتح تُعرّف عبر هووك في الأعلى (انظر أدناه).
}

// معرفة إن كان للحقل إعدادات تفصيلية تستحق زرّ الفتح
function hasSettings(type: string, formType: string, priorCount: number): boolean {
  if (priorCount > 0) return true; // منطق شرطي متاح دائمًا
  if (formType === "EXAM" && fieldType(type)?.gradable) return true;
  return [
    "MULTIPLE_CHOICE",
    "CHECKBOXES",
    "DROPDOWN",
    "LINEAR_SCALE",
    "RATING",
    "SLIDER",
    "RANKING",
    "IMAGE_CHOICE",
    "GRID",
    "ADDRESS",
    "FILE",
    "CONSENT",
    "SHORT_TEXT",
    "PARAGRAPH",
    "PHONE",
    "EMAIL",
    "NUMBER",
    "HIDDEN",
  ].includes(type);
}

// حصص الخيارات: حدّ أقصى لعدد مرات اختيار كل خيار (0 أو فارغ = بلا حدّ)
function QuotasEditor({
  options,
  quotas,
  onChange,
}: {
  options: any[];
  quotas: Record<string, number>;
  onChange: (q: Record<string, number>) => void;
}) {
  const labels = options.map((o) => (typeof o === "string" ? o : o?.label));
  const [open, setOpen] = useState(
    Object.values(quotas).some((v) => Number(v) > 0)
  );
  if (!labels.length) return null;
  return (
    <div className="rounded-xl bg-card p-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => {
            setOpen(e.target.checked);
            if (!e.target.checked) onChange({});
          }}
        />
        تحديد عدد لكل خيار (مثل عدد المقاعد)
      </label>
      {open && (
        <div className="mt-3 space-y-2">
          {labels.map((label: string) => (
            <div key={label} className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm">{label}</span>
              <Input size="sm"
                type="number"
                min={0}
                placeholder="بلا حدّ"
                className="w-28"
                value={quotas[label] ?? ""}
                onChange={(e) => {
                  const next = { ...quotas };
                  const n = Number(e.target.value);
                  if (!e.target.value || n <= 0) delete next[label];
                  else next[label] = n;
                  onChange(next);
                }}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            عند اكتمال العدد يُعطَّل الخيار تلقائيًا ويُرفض على الخادم.
          </p>
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  icon,
  label,
  onClick,
  disabled,
  className = "text-muted-foreground",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <IconTip label={label}>
      <button
        disabled={disabled}
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`rounded-full p-1.5 hover:bg-muted disabled:opacity-30 ${className}`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </button>
    </IconTip>
  );
}

// معاينة حية ثابتة (غير تفاعلية) للحقل داخل البنّاء — تشبه شكله عند التعبئة
function FieldPreview({ q }: { q: QuestionDTO }) {
  const cfg = q.config || {};
  const box =
    "rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground";
  switch (q.type) {
    case "PARAGRAPH":
      return <div className={`${box} h-16`}>{cfg.placeholder || "إجابة نصية طويلة…"}</div>;
    case "DROPDOWN":
      return (
        <div className={`${box} flex items-center justify-between`}>
          <span>— اختر —</span>
          <Icon name="chevron-down" className="h-4 w-4" />
        </div>
      );
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES": {
      const opts: string[] = cfg.options || [];
      const round = q.type === "MULTIPLE_CHOICE";
      return (
        <div className="space-y-1.5">
          {opts.slice(0, 6).map((o, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={`inline-block h-4 w-4 border border-border ${
                  round ? "rounded-full" : "rounded-sm"
                }`}
              />
              {o}
            </div>
          ))}
          {cfg.allowOther && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={`inline-block h-4 w-4 border border-border ${
                  round ? "rounded-full" : "rounded-sm"
                }`}
              />
              أخرى…
            </div>
          )}
        </div>
      );
    }
    case "LINEAR_SCALE": {
      const min = Number(cfg.min ?? 1);
      const max = Number(cfg.max ?? 5);
      const nums = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
      return (
        <div className="flex flex-wrap gap-1.5">
          {nums.slice(0, 12).map((n) => (
            <span
              key={n}
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-sm text-muted-foreground"
            >
              {n}
            </span>
          ))}
        </div>
      );
    }
    case "RATING":
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          {Array.from({ length: Number(cfg.max ?? 5) }, (_, i) => (
            <Icon key={i} name="star" className="h-5 w-5" />
          ))}
        </div>
      );
    case "SLIDER":
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{cfg.min ?? 0}</span>
          <div className="h-1.5 flex-1 rounded-full bg-accent">
            <div className="h-full w-1/2 rounded-full bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground">{cfg.max ?? 100}</span>
        </div>
      );
    case "GRID": {
      const rows: string[] = cfg.rows || [];
      const cols: string[] = cfg.cols || [];
      return (
        <div className="overflow-x-auto">
          <table className="text-center text-xs text-muted-foreground">
            <thead>
              <tr>
                <th></th>
                {cols.map((c) => (
                  <th key={c} className="px-2 py-1 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 4).map((r) => (
                <tr key={r}>
                  <td className="px-2 py-1 text-start">{r}</td>
                  {cols.map((c) => (
                    <td key={c} className="px-2 py-1">
                      <span className="inline-block h-4 w-4 rounded-full border border-border" />
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
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f} className={box}>
              {f}
            </div>
          ))}
        </div>
      );
    }
    case "RANKING": {
      const opts: string[] = cfg.options || [];
      return (
        <div className="space-y-1.5">
          {opts.slice(0, 5).map((o, i) => (
            <div
              key={o}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-xs">
                {i + 1}
              </span>
              {o}
            </div>
          ))}
        </div>
      );
    }
    case "IMAGE_CHOICE": {
      const opts: { label: string; url: string }[] = cfg.options || [];
      return (
        <div className="grid grid-cols-3 gap-2">
          {opts.slice(0, 6).map((o, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border">
              {o.url ? (
                <img src={o.url} alt="" className="h-16 w-full object-cover" />
              ) : (
                <div className="grid h-16 place-items-center bg-muted text-muted-foreground">
                  <Icon name="image" className="h-6 w-6" />
                </div>
              )}
              <div className="truncate p-1 text-center text-xs text-muted-foreground">
                {o.label}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "LOCATION":
      return (
        <div className="flex h-24 items-center justify-center gap-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
          <Icon name="map-pin" className="h-5 w-5" /> خريطة لتحديد الموقع
        </div>
      );
    case "FILE":
      return (
        <div className="flex h-20 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted text-sm text-muted-foreground">
          <Icon name="paperclip" className="h-5 w-5" /> رفع ملف (
          {cfg.accept || "أي صيغة"})
        </div>
      );
    case "SIGNATURE":
      return (
        <div className="flex h-20 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card text-sm text-muted-foreground">
          <Icon name="pen" className="h-5 w-5" /> منطقة التوقيع
        </div>
      );
    case "CONSENT":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-5 w-5 rounded-sm border border-border" />
          {cfg.statement || "أوافق على الشروط والأحكام"}
        </div>
      );
    case "DATE":
      return (
        <div className={`${box} flex w-48 items-center gap-2`}>
          <Icon name="calendar" className="h-4 w-4" /> يوم / شهر / سنة
        </div>
      );
    case "TIME":
      return (
        <div className={`${box} flex w-32 items-center gap-2`}>
          <Icon name="clock" className="h-4 w-4" /> --:--
        </div>
      );
    case "NUMBER":
      return <div className={box}>{cfg.placeholder || "أدخل رقمًا"}</div>;
    case "PHONE":
      return <div className={box}>{cfg.placeholder || "05xxxxxxxx"}</div>;
    case "EMAIL":
      return <div className={box}>{cfg.placeholder || "name@example.com"}</div>;
    default:
      return <div className={box}>{cfg.placeholder || "إجابة نصية قصيرة…"}</div>;
  }
}

function LogicEditor({
  logic,
  priorQuestions,
  onChange,
  sectionMode = false,
}: {
  logic: any;
  priorQuestions: { id: string; label: string; type: string }[];
  onChange: (logic: any) => void;
  sectionMode?: boolean;
}) {
  const enabled = !!(logic && logic.whenQuestionId);
  return (
    <div className="rounded-xl bg-info/10 p-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-info">
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
        <Icon name="branch" className="h-4 w-4" />
        {sectionMode
          ? "إظهار هذا القسم (وكل أسئلته) بشرط"
          : "إظهار هذا السؤال بشرط"}
      </label>
      {enabled && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select
            className={inputVariants({ size: "sm" })}
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
            className={inputVariants({ size: "sm" })}
            value={logic.operator}
            onChange={(e) => onChange({ ...logic, operator: e.target.value })}
          >
            <option value="eq">يساوي</option>
            <option value="neq">لا يساوي</option>
            <option value="contains">يتضمّن</option>
          </select>
          <Input size="sm"
            placeholder="القيمة"
            value={logic.value || ""}
            onChange={(e) => onChange({ ...logic, value: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// رفع صورة/فيديو من الجهاز عبر طبقة التخزين (R2 أو محلي)
function MediaUploadButton({
  kind,
  url,
  onUploaded,
}: {
  kind: "IMAGE" | "VIDEO";
  url: string;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accept = kind === "IMAGE" ? "image/*" : "video/*";
  const maxMB = kind === "IMAGE" ? 10 : 100;

  async function upload(file: File) {
    setError("");
    if (file.size > maxMB * 1024 * 1024) {
      setError(`الحد الأقصى ${bidi(maxMB)} ميجابايت`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUploaded(data.url);
    } catch {
      setError("تعذّر رفع الملف");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium hover:border-primary hover:bg-accent">
        <Icon name={kind === "IMAGE" ? "image" : "film"} className="h-4 w-4" />
        <span>
          {busy
            ? "جارٍ الرفع…"
            : `رفع ${kind === "IMAGE" ? "صورة" : "فيديو"} من الجهاز`}
        </span>
        <input
          type="file"
          className="hidden"
          accept={accept}
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {error && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
          <Icon name="alert" className="h-4 w-4" /> {error}
        </p>
      )}
      {url && kind === "IMAGE" && (
        <img
          src={url}
          alt=""
          className="mt-1.5 max-h-28 rounded-lg border border-border object-contain"
        />
      )}
      {url && kind === "VIDEO" && (
        <p className="mt-1.5 inline-flex items-center gap-1 truncate text-xs text-success">
          <Icon name="check" className="h-4 w-4" /> فيديو مرفق
        </p>
      )}
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
      <Input size="sm"
        type="number"
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
      <Input size="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
