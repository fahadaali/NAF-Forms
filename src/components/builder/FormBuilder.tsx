"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fieldType, FORM_TYPE_LABELS } from "@/lib/field-types";
import type { FieldTypeId } from "@/lib/field-types";
import type { FormDTO, FormSettings, QuestionDTO } from "@/lib/types";
import QuestionEditor from "./QuestionEditor";
import AddQuestionPalette from "./AddQuestionPalette";
import { Icon } from "@/components/ui/Icon";
import DesignPanel from "./DesignPanel";
import ShareTools from "./ShareTools";

let tmpCounter = 0;

export default function FormBuilder({ initial }: { initial: FormDTO }) {
  const router = useRouter();
  const [tab, setTab] = useState<"build" | "design" | "share">("build");
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [type, setType] = useState(initial.type);
  const [status, setStatus] = useState(initial.status);
  const [settings, setSettings] = useState<FormSettings>(initial.settings);
  const [questions, setQuestions] = useState<QuestionDTO[]>(initial.questions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const mark = () => setDirty(true);

  const addQuestion = useCallback(
    (t: FieldTypeId) => {
      const def = fieldType(t)!;
      const id = `tmp-${++tmpCounter}`;
      setQuestions((prev) => [
        ...prev,
        {
          id,
          order: prev.length,
          type: t,
          label: "",
          description: "",
          required: false,
          config: JSON.parse(JSON.stringify(def.defaultConfig)),
        },
      ]);
      setSelectedId(id);
      mark();
    },
    []
  );

  const updateQuestion = (id: string, patch: Partial<QuestionDTO>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    mark();
  };
  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    mark();
  };
  const duplicateQuestion = (id: string) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx < 0) return prev;
      const src = prev[idx];
      const clone: QuestionDTO = {
        ...src,
        id: `tmp-${++tmpCounter}`,
        label: src.label ? `${src.label} (نسخة)` : "",
        config: JSON.parse(JSON.stringify(src.config || {})),
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
    mark();
  };
  const dragIndex = useRef<number | null>(null);
  const reorder = (to: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === to) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    mark();
  };

  const moveQuestion = (id: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
    mark();
  };

  async function save(nextStatus?: string) {
    setSaving(true);
    const res = await fetch(`/api/forms/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        type,
        status: nextStatus ?? status,
        settings,
        questions,
      }),
    });
    const fresh = await res.json();
    // إعادة ربط المعرفات الحقيقية للأسئلة الجديدة
    if (fresh?.questions) {
      setQuestions(
        fresh.questions.map((q: any) => ({
          ...q,
          config: JSON.parse(q.config || "{}"),
        }))
      );
    }
    if (nextStatus) setStatus(nextStatus);
    setSaving(false);
    setDirty(false);
    setSavedAt(new Date().toLocaleTimeString("ar-SA"));
    router.refresh();
  }

  // تنبيه المستخدم قبل مغادرة الصفحة مع وجود تغييرات غير محفوظة
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // فتح المعاينة بعد حفظ التغييرات غير المحفوظة (حتى تظهر الأسئلة المضافة)
  async function openPreview() {
    const w = window.open("", "_blank");
    if (dirty) await save();
    const url = `/f/${initial.slug}`;
    if (w) w.location.href = url;
    else window.open(url, "_blank");
  }

  // فتح صفحة الردود بعد الحفظ إن لزم
  async function openResponses() {
    if (dirty) await save();
    router.push(`/forms/${initial.id}/responses`);
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/f/${initial.slug}`
      : `/f/${initial.slug}`;

  return (
    <div>
      {/* الشريط العلوي */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-extrabold text-naf-700"
          >
            <Icon name="arrow-right" className="h-4 w-4" />
            ناف
          </Link>
          <input
            className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-lg font-bold hover:border-slate-200 focus:border-naf-400 focus:outline-none"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              mark();
            }}
          />
          <span className="text-xs text-slate-400">
            {saving
              ? "جارٍ الحفظ…"
              : dirty
              ? "تغييرات غير محفوظة"
              : savedAt
              ? `حُفظ ${savedAt}`
              : ""}
          </span>
          <button
            onClick={openResponses}
            className="btn-ghost inline-flex items-center gap-1.5 py-1.5 text-sm"
          >
            <Icon name="chart" className="h-4 w-4" /> الردود
          </button>
          <button
            onClick={openPreview}
            className="btn-ghost inline-flex items-center gap-1.5 py-1.5 text-sm"
          >
            <Icon name="eye" className="h-4 w-4" /> معاينة
          </button>
          <button
            className="btn-primary inline-flex items-center gap-1.5 py-1.5 text-sm"
            disabled={saving}
            onClick={() => save()}
          >
            <Icon name="save" className="h-4 w-4" /> حفظ
          </button>
        </div>
        {/* التبويبات */}
        <div className="mx-auto flex max-w-6xl gap-1 px-4">
          {(
            [
              ["build", "الأسئلة", "layers"],
              ["design", "التخصيص", "palette"],
              ["share", "النشر والمشاركة", "rocket"],
            ] as const
          ).map(([k, label, icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
                tab === k
                  ? "border-naf-600 text-naf-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon name={icon} className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "build" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              {/* رأس النموذج */}
              <div className="card border-t-4 border-t-naf-500 p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500">نوع النموذج:</span>
                  {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => {
                        setType(k);
                        mark();
                      }}
                      className={`chip ${
                        type === k
                          ? "bg-naf-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input"
                  placeholder="وصف النموذج (يظهر للمستفيد في البداية)"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    mark();
                  }}
                />
              </div>

              {questions.length === 0 && (
                <div className="card grid place-items-center p-10 text-center text-slate-400">
                  أضف أول عنصر من قائمة العناصر
                </div>
              )}

              <div className="space-y-5" onClick={() => setSelectedId(null)}>
                {questions.map((q, i) => (
                  <QuestionEditor
                    key={q.id}
                    q={q}
                    index={i}
                    total={questions.length}
                    formType={type}
                    selected={selectedId === q.id}
                    onSelect={() => setSelectedId(q.id)}
                    onChange={(patch) => updateQuestion(q.id, patch)}
                    onRemove={() => removeQuestion(q.id)}
                    onMove={(dir) => moveQuestion(q.id, dir)}
                    onDuplicate={() => duplicateQuestion(q.id)}
                    onDragStartItem={() => (dragIndex.current = i)}
                    onDropItem={() => reorder(i)}
                    priorQuestions={questions
                      .slice(0, i)
                      .filter(
                        (p) =>
                          p.type !== "SECTION" &&
                          p.type !== "IMAGE" &&
                          p.type !== "VIDEO" &&
                          p.type !== "PAGE_BREAK"
                      )
                      .map((p) => ({ id: p.id, label: p.label, type: p.type }))}
                  />
                ))}
              </div>
            </div>
            <AddQuestionPalette onAdd={addQuestion} />
          </div>
        )}

        {tab === "design" && (
          <DesignPanel
            formType={type}
            settings={settings}
            onChange={(s) => {
              setSettings(s);
              mark();
            }}
          />
        )}

        {tab === "share" && (
          <div className="mx-auto max-w-xl space-y-5">
            <div className="card p-6">
              <h3 className="mb-2 font-bold">حالة النموذج</h3>
              <p className="mb-4 text-sm text-slate-500">
                لا يمكن استقبال الردود إلا بعد نشر النموذج.
              </p>
              <div className="flex gap-2">
                <button
                  className={`inline-flex items-center gap-1.5 ${status === "PUBLISHED" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => save("PUBLISHED")}
                >
                  <Icon name="check-circle" className="h-4 w-4" /> نشر
                </button>
                <button
                  className={`inline-flex items-center gap-1.5 ${status === "DRAFT" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => save("DRAFT")}
                >
                  <Icon name="edit" className="h-4 w-4" /> مسودة
                </button>
                <button
                  className={`inline-flex items-center gap-1.5 ${status === "CLOSED" ? "btn-danger" : "btn-ghost"}`}
                  onClick={() => save("CLOSED")}
                >
                  <Icon name="lock" className="h-4 w-4" /> إغلاق
                </button>
              </div>
            </div>
            <div className="card p-6">
              <h3 className="mb-2 font-bold">رابط التقديم</h3>
              <div className="flex gap-2">
                <input className="input" dir="ltr" readOnly value={publicUrl} />
                <button
                  className="btn-ghost"
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                >
                  نسخ
                </button>
              </div>
              <Link
                href={`/f/${initial.slug}`}
                target="_blank"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-naf-600 hover:underline"
              >
                فتح صفحة التقديم
                <Icon name="external-link" className="h-4 w-4" />
              </Link>
            </div>
            <ShareTools url={publicUrl} />
          </div>
        )}
      </main>
    </div>
  );
}
