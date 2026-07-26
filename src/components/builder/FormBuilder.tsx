"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fieldType, FORM_TYPE_LABELS } from "@/lib/field-types";
import type { FieldTypeId } from "@/lib/field-types";
import type { FormDTO, FormSettings, QuestionDTO } from "@/lib/types";
import QuestionEditor from "./QuestionEditor";
import AddQuestionPalette from "./AddQuestionPalette";
import { Icon, IconTip } from "@/components/ui/Icon";
import DesignPanel from "./DesignPanel";
import ShareTools from "./ShareTools";
import { bidi } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, inputVariants } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

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
  const [slug, setSlug] = useState(initial.slug);
  const [slugDraft, setSlugDraft] = useState(initial.slug);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugMsg, setSlugMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // كل تعديل يسجّل لقطة الحالة السابقة (تُستخدم للتراجع) ويعلّم النموذج كمُعدَّل.
  // القيم المقروءة هنا هي ما قبل التحديث لأن تحديثات React غير فورية.
  const mark = () => {
    if (!restoring.current) pushHistory(snapshot());
    setDirty(true);
  };

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

  // مرجع دائم لأحدث save حتى يستدعيه مؤقّت الحفظ التلقائي بقيمة محدّثة
  const saveRef = useRef<(s?: string) => Promise<void>>(async () => {});

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
  saveRef.current = save;

  // حفظ تلقائي بعد توقّف التعديل (٣ ثوانٍ) — لا يعمل أثناء حفظ جارٍ
  const [autoSave, setAutoSave] = useState(true);
  useEffect(() => {
    if (!autoSave || !dirty || saving) return;
    const id = setTimeout(() => {
      void saveRef.current();
    }, 3000);
    return () => clearTimeout(id);
  }, [autoSave, dirty, saving, questions, settings, title, description, type]);

  // ===== تراجع / إعادة =====
  // نحفظ لقطات من الحالة القابلة للتحرير عند كل تغيير
  type Snapshot = {
    title: string;
    description: string;
    type: string;
    settings: FormSettings;
    questions: QuestionDTO[];
  };
  const snapshot = (): Snapshot => ({
    title,
    description,
    type,
    settings,
    questions,
  });
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const restoring = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  function pushHistory(prev: Snapshot) {
    history.current.push(prev);
    if (history.current.length > 50) history.current.shift();
    future.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function apply(s: Snapshot) {
    restoring.current = true;
    setTitle(s.title);
    setDescription(s.description);
    setType(s.type);
    setSettings(s.settings);
    setQuestions(s.questions);
    setDirty(true);
    // نُلغي علم الاستعادة بعد دورة العرض حتى لا تُسجَّل كتغيير جديد
    setTimeout(() => (restoring.current = false), 0);
  }

  function undo() {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(snapshot());
    apply(prev);
    setCanUndo(history.current.length > 0);
    setCanRedo(true);
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(snapshot());
    apply(next);
    setCanRedo(future.current.length > 0);
    setCanUndo(true);
  }

  // اختصارات: Ctrl/Cmd+Z للتراجع، Ctrl/Cmd+Shift+Z أو Ctrl+Y للإعادة، Ctrl+S للحفظ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        void saveRef.current();
      } else if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تحديث رابط النموذج (مع التحقق من الصيغة والتفرّد على الخادم)
  async function saveSlug() {
    setSavingSlug(true);
    setSlugMsg(null);
    const res = await fetch(`/api/forms/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slugDraft.trim() }),
    });
    setSavingSlug(false);
    if (res.ok) {
      const fresh = await res.json().catch(() => null);
      const next = fresh?.slug || slugDraft.trim();
      setSlug(next);
      setSlugDraft(next);
      setSlugMsg({ ok: true, text: "تم تحديث الرابط" });
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setSlugMsg({ ok: false, text: d.error || "تعذّر تحديث الرابط" });
    }
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
    const url = `/f/${slug}`;
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
      ? `${window.location.origin}/f/${slug}`
      : `/f/${slug}`;

  return (
    <div>
      {/* الشريط العلوي */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold text-primary"
          >
            <Icon name="arrow-right" className="h-4 w-4" />
            ناف
          </Link>
          <input
            className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-lg font-bold hover:border-border focus:border-primary focus:outline-none"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              mark();
            }}
          />
          {/* تراجع / إعادة */}
          <IconTip label="تراجع (Ctrl+Z)">
            <button
              onClick={undo}
              disabled={!canUndo}
              aria-label="تراجع"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <Icon name="undo" className="h-4 w-4" />
            </button>
          </IconTip>
          <IconTip label="إعادة (Ctrl+Shift+Z)">
            <button
              onClick={redo}
              disabled={!canRedo}
              aria-label="إعادة"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <Icon name="redo" className="h-4 w-4" />
            </button>
          </IconTip>

          <span className="text-xs text-muted-foreground" aria-live="polite">
            {saving
              ? "جارٍ الحفظ…"
              : dirty
              ? autoSave
                ? "سيُحفظ تلقائيًا…"
                : "تغييرات غير محفوظة"
              : savedAt
              ? `حُفظ ${bidi(savedAt)}`
              : ""}
          </span>
          <IconTip label={autoSave ? "إيقاف الحفظ التلقائي" : "تفعيل الحفظ التلقائي"}>
            <button
              onClick={() => setAutoSave((v) => !v)}
              aria-pressed={autoSave}
              aria-label="الحفظ التلقائي"
              className={`rounded-lg p-1.5 hover:bg-muted ${
                autoSave ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </IconTip>
          <Button variant="outline" size="sm"
            onClick={openResponses}
            className="gap-1.5"
          >
            <Icon name="chart" className="h-4 w-4" /> الردود
          </Button>
          <Button variant="outline" size="sm"
            onClick={openPreview}
            className="gap-1.5"
          >
            <Icon name="eye" className="h-4 w-4" /> معاينة
          </Button>
          <Button size="sm"
            className="gap-1.5"
            disabled={saving}
            onClick={() => save()}
          >
            <Icon name="save" className="h-4 w-4" /> حفظ
          </Button>
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
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
              <Card className="border-t-4 border-t-primary p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">نوع النموذج:</span>
                  {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => {
                        setType(k);
                        mark();
                      }}
                      className={`chip ${
                        type === k
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <textarea
                  className={cn(inputVariants(), "h-auto py-2")}
                  placeholder="وصف النموذج (يظهر للمستفيد في البداية)"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    mark();
                  }}
                />
              </Card>

              {questions.length === 0 && (
                <Card className="grid place-items-center p-10 text-center text-muted-foreground">
                  ابدأ بإضافة أول عنصر من قائمة العناصر
                </Card>
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
            formId={initial.id}
            settings={settings}
            onChange={(s) => {
              setSettings(s);
              mark();
            }}
          />
        )}

        {tab === "share" && (
          <div className="mx-auto max-w-xl space-y-5">
            <Card className="p-6">
              <h3 className="mb-2 font-bold">حالة النموذج</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                لا يمكن استقبال الردود إلا بعد نشر النموذج.
              </p>
              <div className="flex gap-2">
                <Button
                  variant={status === "PUBLISHED" ? "default" : "outline"}
                  onClick={() => save("PUBLISHED")}
                >
                  <Icon name="check-circle" className="h-4 w-4" /> نشر
                </Button>
                <Button
                  variant={status === "DRAFT" ? "default" : "outline"}
                  onClick={() => save("DRAFT")}
                >
                  <Icon name="edit" className="h-4 w-4" /> مسودة
                </Button>
                <Button
                  variant={status === "CLOSED" ? "destructive" : "outline"}
                  onClick={() => save("CLOSED")}
                >
                  <Icon name="lock" className="h-4 w-4" /> إغلاق
                </Button>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="mb-2 font-bold">رابط التقديم</h3>
              <div className="flex gap-2">
                <Input dir="ltr" readOnly value={publicUrl} />
                <Button variant="outline"
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                >
                  نسخ
                </Button>
              </div>

              {/* تخصيص الرابط */}
              <label className="label mt-4">تخصيص الرابط</label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs text-muted-foreground" dir="ltr">
                  /f/
                </span>
                <Input size="sm"
                  dir="ltr"
                  placeholder="my-form-name"
                  value={slugDraft}
                  onChange={(e) => {
                    setSlugDraft(e.target.value);
                    setSlugMsg(null);
                  }}
                />
                <Button variant="outline" size="sm"
                  className="shrink-0"
                  disabled={savingSlug || !slugDraft.trim() || slugDraft === slug}
                  onClick={saveSlug}
                >
                  {savingSlug ? "جارٍ…" : "تحديث"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                حروف إنجليزية وأرقام وشرطات فقط. تغيير الرابط يُبطل الروابط
                المنشورة سابقًا.
              </p>
              {slugMsg && (
                <p
                  className={`mt-1 text-sm ${
                    slugMsg.ok ? "text-success" : "text-destructive"
                  }`}
                >
                  {slugMsg.text}
                </p>
              )}

              <Link
                href={`/f/${slug}`}
                target="_blank"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                فتح صفحة التقديم
                <Icon name="external-link" className="h-4 w-4" />
              </Link>
            </Card>
            <ShareTools url={publicUrl} />
          </div>
        )}
      </main>
    </div>
  );
}
