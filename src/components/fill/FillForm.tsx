"use client";
import { useMemo, useState } from "react";
import QuestionInput from "@/components/QuestionInput";
import { youtubeEmbed, isInputQuestion, isVisibleByLogic } from "@/lib/utils";
import type { FormDTO } from "@/lib/types";

type Phase = "intro" | "question" | "done";

export default function FillForm({
  form,
  locked = false,
}: {
  form: FormDTO;
  locked?: boolean;
}) {
  const s = form.settings;
  const theme = s.theme || {};
  const behavior = s.behavior || {};
  const cardMode = behavior.oneQuestionPerCard !== false;

  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState("");
  const [anim, setAnim] = useState("animate-card-in");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score?: number; total?: number } | null>(null);

  // حماية بكلمة مرور + جمع بريد المستفيد
  const [unlocked, setUnlocked] = useState(!locked);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [hp, setHp] = useState(""); // مصيدة سبام

  async function unlock() {
    setChecking(true);
    setPwError("");
    const res = await fetch(`/api/f/${form.slug}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setChecking(false);
    if (data.ok) setUnlocked(true);
    else setPwError("كلمة المرور غير صحيحة");
  }

  // تطبيق المنطق الشرطي: عرض الأسئلة التي تتحقق شروطها فقط
  const questions = form.questions.filter((q) =>
    isVisibleByLogic(q.config, answers)
  );
  const safeStep = Math.min(step, Math.max(0, questions.length - 1));
  const current = questions[safeStep];

  const pageStyle: React.CSSProperties = {
    background: theme.background,
    color: theme.text,
    minHeight: "100vh",
  };
  const accent = theme.primary || "#1c59f5";

  function validate(q: (typeof questions)[number]): boolean {
    if (!q.required || !isInputQuestion(q.type)) return true;
    const v = answers[q.id];
    const empty =
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
    if (empty) {
      setError("هذا السؤال إلزامي");
      return false;
    }
    return true;
  }

  function goNext() {
    if (current && !validate(current)) return;
    setError("");
    if (safeStep < questions.length - 1) {
      setAnim("animate-card-in");
      setStep(safeStep + 1);
    } else {
      submit();
    }
  }
  function goBack() {
    setError("");
    if (safeStep > 0) {
      setStep(safeStep - 1);
    } else {
      setPhase("intro");
    }
  }

  async function submit() {
    // تحقق نهائي من الإلزامي
    for (const q of questions) {
      if (!validate(q)) {
        setStep(questions.indexOf(q));
        setPhase("question");
        return;
      }
    }
    setSubmitting(true);
    const res = await fetch(`/api/f/${form.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, password, email, hp }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "تعذّر الإرسال");
      return;
    }
    const data = await res.json();
    setResult({ score: data.score, total: data.total });
    setPhase("done");
  }

  const progress = useMemo(
    () => (questions.length ? Math.round(((safeStep + 1) / questions.length) * 100) : 0),
    [safeStep, questions.length]
  );

  // ===== بوابة كلمة المرور =====
  if (!unlocked) {
    return (
      <div style={pageStyle} className="grid place-items-center px-4">
        <div
          className="w-full max-w-sm rounded-3xl p-8 text-center shadow-xl"
          style={{ background: theme.cardBg }}
        >
          <div className="mb-3 text-5xl">🔒</div>
          <h1 className="text-xl font-extrabold">{form.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            هذا النموذج محمي بكلمة مرور. أدخلها للمتابعة.
          </p>
          <input
            type="password"
            className="input mt-5 text-center"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            autoFocus
          />
          {pwError && <p className="mt-2 text-sm text-red-600">{pwError}</p>}
          <button
            onClick={unlock}
            disabled={checking || !password}
            className="mt-4 w-full rounded-xl px-6 py-3 font-bold text-white shadow-lg disabled:opacity-50"
            style={{ background: accent }}
          >
            {checking ? "جارٍ التحقق…" : "دخول"}
          </button>
        </div>
      </div>
    );
  }

  // ===== شاشة النهاية =====
  if (phase === "done") {
    const after = s.afterSubmit || {};
    return (
      <div style={pageStyle} className="grid place-items-center px-4">
        <div
          className="w-full max-w-lg rounded-3xl p-10 text-center shadow-xl"
          style={{ background: theme.cardBg }}
        >
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="text-2xl font-extrabold">{after.title}</h1>
          <p className="mt-3 text-slate-500">{after.message}</p>
          {after.showScore && result?.total ? (
            <div
              className="mx-auto mt-6 inline-block rounded-2xl px-8 py-4 text-white"
              style={{ background: accent }}
            >
              <div className="text-sm opacity-90">درجتك</div>
              <div className="text-3xl font-extrabold">
                {result.score} / {result.total}
              </div>
            </div>
          ) : null}
          {after.redirectUrl && (
            <a href={after.redirectUrl} className="mt-6 inline-block font-medium underline" style={{ color: accent }}>
              متابعة ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  // ===== المقدمة =====
  if (phase === "intro") {
    const cover = s.cover || {};
    const content = s.content || {};
    const embed = youtubeEmbed(cover.youtubeUrl);
    return (
      <div style={pageStyle} className="px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl shadow-xl" style={{ background: theme.cardBg }}>
            {cover.imageUrl && (
              <img src={cover.imageUrl} alt="" className="h-48 w-full object-cover" />
            )}
            <div className="p-8">
              {cover.logoUrl && (
                <img src={cover.logoUrl} alt="" className="mb-4 h-14 object-contain" />
              )}
              <h1 className="text-3xl font-extrabold">{form.title}</h1>
              {form.description && (
                <p className="mt-3 whitespace-pre-line text-slate-500">{form.description}</p>
              )}

              {embed && (
                <iframe className="mt-5 aspect-video w-full rounded-xl" src={embed} allowFullScreen />
              )}

              {content.links && content.links.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {content.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      className="chip border"
                      style={{ borderColor: accent, color: accent }}
                    >
                      🔗 {l.label || l.url}
                    </a>
                  ))}
                </div>
              )}

              {content.files && content.files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {content.files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                    >
                      <span className="truncate">📄 {f.name}</span>
                      <span className="flex gap-3">
                        <a href={f.url} target="_blank" className="underline" style={{ color: accent }}>
                          عرض
                        </a>
                        {f.downloadable && (
                          <a href={f.url} download className="underline" style={{ color: accent }}>
                            تنزيل
                          </a>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {behavior.collectEmail && (
                <div className="mt-6 text-right">
                  <label className="label">
                    بريدك الإلكتروني <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    className="input text-right"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  if (questions.length === 0) return;
                  if (
                    behavior.collectEmail &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                  ) {
                    setEmailError("يرجى إدخال بريد إلكتروني صحيح");
                    return;
                  }
                  setPhase("question");
                  setStep(0);
                }}
                className="mt-8 w-full rounded-xl px-6 py-3.5 text-lg font-bold text-white shadow-lg transition hover:opacity-90"
                style={{ background: accent }}
              >
                البدء ←
              </button>
              <p className="mt-3 text-center text-xs text-slate-400">
                {questions.length} سؤال · اضغط Enter للانتقال
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== وضع كل الأسئلة في صفحة واحدة =====
  if (!cardMode) {
    return (
      <div style={pageStyle} className="px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-2xl font-extrabold">{form.title}</h1>
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl p-6 shadow-sm" style={{ background: theme.cardBg }}>
              <QuestionCard q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} accent={accent} index={i} />
            </div>
          ))}
          {error && <p className="text-center font-medium text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-xl px-6 py-3.5 text-lg font-bold text-white shadow-lg"
            style={{ background: accent }}
          >
            {submitting ? "جارٍ الإرسال…" : "إرسال"}
          </button>
        </div>
      </div>
    );
  }

  // ===== وضع البطاقات (سؤال لكل بطاقة) =====
  return (
    <div
      style={pageStyle}
      className="flex flex-col px-4 py-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
          goNext();
        }
      }}
    >
      {/* مصيدة سبام مخفية عن المستخدم */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        aria-hidden
      />
      {behavior.showProgress !== false && (
        <div className="mx-auto w-full max-w-2xl">
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: accent }} />
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            {safeStep + 1} من {questions.length}
          </p>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center py-6">
        <div key={safeStep} className={`w-full max-w-2xl rounded-3xl p-8 shadow-xl ${anim}`} style={{ background: theme.cardBg }}>
          <QuestionCard
            q={current}
            value={answers[current.id]}
            onChange={(v) => {
              setAnswers((a) => ({ ...a, [current.id]: v }));
              setError("");
            }}
            accent={accent}
            index={safeStep}
          />
          {error && <p className="mt-4 font-medium text-red-600">{error}</p>}

          <div className="mt-8 flex items-center justify-between">
            {behavior.allowBack !== false ? (
              <button onClick={goBack} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-black/5">
                ← السابق
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={goNext}
              disabled={submitting}
              className="rounded-xl px-8 py-3 font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: accent }}
            >
              {submitting
                ? "جارٍ الإرسال…"
                : safeStep === questions.length - 1
                ? "إرسال ✓"
                : "التالي →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  value,
  onChange,
  accent,
  index,
}: {
  q: FormDTO["questions"][number];
  value: any;
  onChange: (v: any) => void;
  accent: string;
  index: number;
}) {
  if (q.type === "SECTION") {
    return (
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: accent }}>
          {q.label}
        </h2>
        {q.description && <p className="mt-2 whitespace-pre-line text-slate-500">{q.description}</p>}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1 text-sm font-medium" style={{ color: accent }}>
        سؤال {index + 1}
      </div>
      <h2 className="text-xl font-bold leading-relaxed">
        {q.label}
        {q.required && <span className="mr-1 text-red-500">*</span>}
      </h2>
      {q.description && <p className="mt-1.5 text-sm text-slate-500">{q.description}</p>}
      <div className="mt-5">
        <QuestionInput question={q} value={value} onChange={onChange} accent={accent} />
      </div>
    </div>
  );
}
