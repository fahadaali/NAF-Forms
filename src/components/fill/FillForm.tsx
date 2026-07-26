"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import QuestionInput from "@/components/QuestionInput";
import { Icon } from "@/components/ui/Icon";
import {
  youtubeEmbed,
  isInputQuestion,
  isHiddenField,
  computeVisibleQuestions,
  validateAnswer,
} from "@/lib/utils";
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
  const [result, setResult] = useState<{
    score?: number;
    total?: number;
    passed?: boolean;
    review?: any[];
    responseId?: string;
  } | null>(null);

  // إعدادات الاختبار: خلط الأسئلة والمؤقّت
  const exam = s.exam || {};
  const timeLimit = form.type === "EXAM" ? exam.timeLimitMin : null;
  const [remaining, setRemaining] = useState<number | null>(null);

  // حماية بكلمة مرور + جمع بريد المستفيد
  const [unlocked, setUnlocked] = useState(!locked);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [hp, setHp] = useState(""); // مصيدة سبام

  // تتبّع الزيارة (تحليلات الإكمال) + المسودّة + حصص الخيارات
  const visitId = useRef<string | null>(null);
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<
    Record<string, Record<string, number>>
  >({});

  // التعبئة المسبقة من الرابط + قيم الحقول المخفية (مرة واحدة عند التحميل)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const seed: Record<string, any> = {};
    for (const q of form.questions) {
      const cfg = q.config || {};
      if (isHiddenField(q.type)) {
        const fromUrl = cfg.paramName ? sp.get(cfg.paramName) : null;
        const val = fromUrl ?? cfg.defaultValue ?? "";
        if (val !== "") seed[q.id] = val;
      } else if (cfg.prefillKey) {
        const val = sp.get(cfg.prefillKey);
        if (val !== null && val !== "") seed[q.id] = val;
      }
    }
    if (Object.keys(seed).length) setAnswers((a) => ({ ...seed, ...a }));

    // استئناف مسودّة محفوظة
    const token = sp.get("resume");
    if (token) {
      setDraftToken(token);
      fetch(`/api/f/${form.slug}/draft?token=${encodeURIComponent(token)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.ok) return;
          setAnswers((a) => ({ ...a, ...(d.answers || {}) }));
          if (d.email) setEmail(d.email);
        })
        .catch(() => {});
    }

    // المتبقي من حصص الخيارات
    fetch(`/api/f/${form.slug}/quotas`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.remaining && setQuotaRemaining(d.remaining))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ترتيب الأسئلة (مع خلطها للاختبارات عند التفعيل) — يُحسب مرة واحدة.
  // نخلط أسئلة الإدخال فقط ونُبقي العناصر التنسيقية (أقسام/فواصل/صور/فيديو)
  // في مواضعها حتى لا تنكسر بنية الأقسام والصفحات.
  const baseOrder = useMemo(() => {
    let arr = [...form.questions];

    if (form.type === "EXAM" && exam.shuffle) {
      const idxs = arr
        .map((q, i) => (isInputQuestion(q.type) ? i : -1))
        .filter((i) => i >= 0);
      const picked = idxs.map((i) => arr[i]);
      for (let i = picked.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [picked[i], picked[j]] = [picked[j], picked[i]];
      }
      idxs.forEach((pos, k) => (arr[pos] = picked[k]));
    }

    // بنك أسئلة: اختيار عدد محدّد عشوائيًا من أسئلة الاختبار
    const want = Number(exam.questionCount ?? 0);
    if (form.type === "EXAM" && want > 0) {
      const inputs = arr.filter((q) => isInputQuestion(q.type));
      if (want < inputs.length) {
        const pool = [...inputs];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const keep = new Set(pool.slice(0, want).map((q) => q.id));
        // نُبقي العناصر التنسيقية وأسئلة العيّنة المختارة فقط
        arr = arr.filter((q) => !isInputQuestion(q.type) || keep.has(q.id));
      }
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تطبيق المنطق الشرطي (على مستوى السؤال والقسم): عرض العناصر المتحقّقة شروطها
  const questions = computeVisibleQuestions(baseOrder, answers);

  // تقسيم العناصر إلى بطاقات (steps): يمكن أن تحتوي البطاقة أكثر من عنصر/سؤال.
  // إن وُجدت فواصل صفحات (PAGE_BREAK) نجمّع ما بينها في بطاقة واحدة،
  // وإلا فبطاقة لكل عنصر (النمط الافتراضي).
  const steps = useMemo(() => {
    // الحقول المخفية تُسجَّل دون أن تُعرض، فلا تُحتسب بطاقة
    const shown = questions.filter((q) => !isHiddenField(q.type));
    const hasBreaks = shown.some((q) => q.type === "PAGE_BREAK");
    if (hasBreaks) {
      const pages: (typeof shown)[] = [];
      let cur: typeof shown = [];
      for (const q of shown) {
        if (q.type === "PAGE_BREAK") {
          pages.push(cur);
          cur = [];
        } else cur.push(q);
      }
      pages.push(cur);
      return pages.filter((p) => p.length > 0);
    }
    return shown
      .filter((q) => q.type !== "PAGE_BREAK")
      .map((q) => [q] as typeof shown);
  }, [questions]);

  const safeStep = Math.min(step, Math.max(0, steps.length - 1));
  const currentStep = steps[safeStep] || [];

  const pageStyle: React.CSSProperties = {
    background: theme.background,
    color: theme.text,
    minHeight: "100vh",
  };
  // لون التمييز يأتي من إعدادات النموذج نفسه (اختيار المستخدم، مخزَّن في D1)،
  // فسطح التعبئة لا يتبع الوضعين الفاتح/الداكن. لذلك يبقى `text-white` هنا بدل
  // `text-primary-foreground`: الرمز ينقلب مع الوضع والخلفية لا تنقلب.
  // ربط هذا السطح بالسجلّ موقوف على قرار الألوان المخزَّنة (audit/mapping.md §٥).
  const accent = theme.primary || "#44528a";

  // تحقق من بطاقة كاملة (قد تضم عدة أسئلة)
  function validateStep(stepQs: typeof questions): boolean {
    for (const q of stepQs) {
      if (!isInputQuestion(q.type)) continue;
      const err = validateAnswer(q.type, q.config || {}, answers[q.id], q.required);
      if (err) {
        setError(stepQs.length > 1 ? `«${q.label}»: ${err}` : err);
        return false;
      }
    }
    return true;
  }

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function clearAdvance() {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }

  function goNext() {
    clearAdvance();
    if (currentStep.length && !validateStep(currentStep)) return;
    setError("");
    if (safeStep < steps.length - 1) {
      setAnim("animate-card-in");
      setStep(safeStep + 1);
    } else {
      submit();
    }
  }
  function goBack() {
    clearAdvance();
    setError("");
    if (safeStep > 0) {
      setStep(safeStep - 1);
    } else {
      setPhase("intro");
    }
  }

  // مرجع دائم لأحدث goNext حتى يستدعيه مؤقّت الانتقال التلقائي بقيمة محدّثة
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  // الانتقال التلقائي عند اختيار إجابة واحدة (اختيار من متعدد) أو الموافقة
  // — فقط عندما تحتوي البطاقة سؤالًا واحدًا.
  function maybeAutoAdvance(q: (typeof questions)[number], val: any) {
    if (!cardMode || behavior.autoAdvance === false) return;
    if (currentStep.length !== 1) return;
    if (safeStep >= steps.length - 1) return; // لا ننتقل تلقائيًا في آخر بطاقة
    const eligible =
      (q.type === "MULTIPLE_CHOICE" &&
        typeof val === "string" &&
        (q.config?.options || []).includes(val)) ||
      (q.type === "IMAGE_CHOICE" && typeof val === "string" && val !== "") ||
      (q.type === "CONSENT" && val === true);
    if (!eligible) return;
    clearAdvance();
    advanceTimer.current = setTimeout(() => goNextRef.current(), 350);
  }

  async function submit() {
    // تحقق نهائي من كل البطاقات: ننتقل لأول بطاقة بها خطأ
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(steps[i])) {
        setStep(i);
        setPhase("question");
        return;
      }
    }
    setSubmitting(true);
    const res = await fetch(`/api/f/${form.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        password,
        email,
        hp,
        visitId: visitId.current,
        draftToken,
        // الأسئلة المعروضة فعلًا (يلزم الخادم عند تفعيل بنك الأسئلة العشوائي)
        askedIds: baseOrder
          .filter((q) => isInputQuestion(q.type))
          .map((q) => q.id),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "تعذّر الإرسال");
      return;
    }
    const data = await res.json();
    setResult({
      score: data.score,
      total: data.total,
      passed: data.passed,
      review: data.review,
      responseId: data.responseId,
    });
    setPhase("done");
  }

  // مؤقّت الاختبار: العدّ التنازلي والتسليم التلقائي عند انتهاء الوقت
  useEffect(() => {
    if (phase !== "question" || !timeLimit) return;
    if (remaining === null) {
      setRemaining(timeLimit * 60);
      return;
    }
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => (r ?? 0) - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, remaining, timeLimit]);

  useEffect(() => {
    if (remaining === 0 && phase === "question" && !submitting) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const progress = useMemo(
    () => (steps.length ? Math.round(((safeStep + 1) / steps.length) * 100) : 0),
    [safeStep, steps.length]
  );

  // تسجيل آخر سؤال وُصل إليه (لحساب نقاط التسرّب)
  useEffect(() => {
    if (phase !== "question" || !visitId.current) return;
    const first = currentStep[0];
    if (!first) return;
    fetch(`/api/f/${form.slug}/visit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitId: visitId.current, questionId: first.id }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, safeStep]);

  // حفظ الإجابات ومتابعتها لاحقًا برابط استئناف
  async function saveForLater() {
    setSavingDraft(true);
    const res = await fetch(`/api/f/${form.slug}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, email, token: draftToken }),
    });
    setSavingDraft(false);
    if (!res.ok) {
      setError("تعذّر حفظ المسودّة");
      return;
    }
    const d = await res.json();
    setDraftToken(d.token);
    const url = `${window.location.origin}/f/${form.slug}?resume=${d.token}`;
    setResumeUrl(url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* النسخ اختياري */
    }
  }

  // ===== بوابة كلمة المرور =====
  if (!unlocked) {
    return (
      <div style={pageStyle} className="grid place-items-center px-4">
        <div
          className="w-full max-w-sm rounded-xl p-8 text-center shadow-xl"
          style={{ background: theme.cardBg }}
        >
          <div className="mb-3 flex justify-center text-muted-foreground">
            <Icon name="lock" className="h-12 w-12" />
          </div>
          <h1 className="text-xl font-bold">{form.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
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
          {pwError && <p className="mt-2 text-sm text-destructive">{pwError}</p>}
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
          className="w-full max-w-lg rounded-xl p-10 text-center shadow-xl"
          style={{ background: theme.cardBg }}
        >
          <div className="mb-4 flex justify-center text-success">
            <Icon name="check-circle" className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-bold">{after.title}</h1>
          <p className="mt-3 text-muted-foreground">{after.message}</p>
          {after.showScore && result?.total ? (
            <div
              className="mx-auto mt-6 inline-block rounded-xl px-8 py-4 text-white"
              style={{ background: accent }}
            >
              <div className="text-sm opacity-90">درجتك</div>
              <div className="text-3xl font-bold">
                {result.score} / {result.total}
              </div>
            </div>
          ) : null}

          {result?.passed !== undefined && after.showScore && (
            <div
              className={`mx-auto mt-4 inline-block rounded-full px-6 py-2 text-sm font-bold ${
                result.passed
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Icon
                  name={result.passed ? "check-circle" : "x-circle"}
                  className="h-4 w-4"
                />
                {result.passed ? "ناجح" : "لم تجتز"}
              </span>
            </div>
          )}

          {result?.review && result.review.length > 0 && (
            <div className="mt-6 space-y-2 text-right">
              <h3 className="font-bold">مراجعة الإجابات</h3>
              {result.review.map((r: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3 text-sm ${
                    r.correct
                      ? "border-success/30 bg-success/10"
                      : "border-destructive/30 bg-destructive/10"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Icon
                      name={r.correct ? "check-circle" : "x-circle"}
                      className={`h-4 w-4 ${r.correct ? "text-success" : "text-destructive"}`}
                    />
                    {r.label}
                  </div>
                  {!r.correct && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      إجابتك: {String(Array.isArray(r.your) ? r.your.join("، ") : r.your) || "—"}
                      {" · "}الصحيحة:{" "}
                      {String(
                        Array.isArray(r.correctAnswer)
                          ? r.correctAnswer.join("، ")
                          : r.correctAnswer
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* شهادة الاختبار للناجحين */}
          {form.type === "EXAM" &&
            s.exam?.certificate &&
            result?.passed !== false &&
            result?.responseId && (
              <a
                href={`/certificate/${result.responseId}`}
                target="_blank"
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white shadow-lg"
                style={{ background: accent }}
              >
                <Icon name="badge-check" className="h-5 w-5" /> استلام الشهادة
              </a>
            )}

          {after.redirectUrl && (
            <a
              href={after.redirectUrl}
              className="mt-6 inline-flex items-center gap-1 font-medium underline"
              style={{ color: accent }}
            >
              متابعة <Icon name="external-link" className="h-4 w-4" />
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
          <div className="overflow-hidden rounded-xl shadow-xl" style={{ background: theme.cardBg }}>
            {cover.imageUrl && (
              <img src={cover.imageUrl} alt="" className="h-48 w-full object-cover" />
            )}
            <div className="p-8">
              {cover.logoUrl && (
                <img src={cover.logoUrl} alt="" className="mb-4 h-14 object-contain" />
              )}
              <h1 className="text-3xl font-bold">{form.title}</h1>
              {form.description && (
                <p className="mt-3 whitespace-pre-line text-muted-foreground">{form.description}</p>
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
                      className="chip inline-flex items-center gap-1.5 border"
                      style={{ borderColor: accent, color: accent }}
                    >
                      <Icon name="link" className="h-3.5 w-3.5" />
                      {l.label || l.url}
                    </a>
                  ))}
                </div>
              )}

              {content.files && content.files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {content.files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm"
                    >
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <Icon name="paperclip" className="h-4 w-4 shrink-0" />
                        {f.name}
                      </span>
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
                    بريدك الإلكتروني <span className="text-destructive">*</span>
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
                    <p className="mt-1 text-sm text-destructive">{emailError}</p>
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
                  // بدء تتبّع الزيارة (لا يعطّل التعبئة إن فشل)
                  fetch(`/api/f/${form.slug}/visit`, { method: "POST" })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => {
                      if (d?.visitId) visitId.current = d.visitId;
                    })
                    .catch(() => {});
                }}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-lg font-bold text-white shadow-lg transition hover:opacity-90"
                style={{ background: accent }}
              >
                البدء
                <Icon name="arrow-right" className="h-5 w-5 rotate-180" />
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {questions.filter((q) => isInputQuestion(q.type)).length} سؤال ·
                اضغط Enter للانتقال
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
          <h1 className="text-2xl font-bold">{form.title}</h1>
          {questions
            .filter((q) => q.type !== "PAGE_BREAK")
            .map((q, i) => (
              <div key={q.id} className="rounded-xl p-6 shadow-sm" style={{ background: theme.cardBg }}>
                <QuestionCard q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} accent={accent} index={i} />
              </div>
            ))}
          {error && <p className="text-center font-medium text-destructive">{error}</p>}
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

  // ===== وضع البطاقات (بطاقة واحدة قد تضم عدة أسئلة/عناصر) =====
  const multi = currentStep.length > 1;
  return (
    <div
      style={pageStyle}
      className="flex flex-col px-4 py-6"
      onKeyDown={(e) => {
        // في البطاقات متعددة الأسئلة لا ننتقل بمفتاح Enter تلقائيًا
        if (
          !multi &&
          e.key === "Enter" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA"
        ) {
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
          <div
            className="h-1.5 overflow-hidden rounded-full bg-black/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`التقدّم: ${safeStep + 1} من ${steps.length}`}
          >
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: accent }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {safeStep + 1} من {steps.length}
            </span>
            {timeLimit && remaining !== null && (
              <span
                className={`inline-flex items-center gap-1 font-bold ${remaining <= 30 ? "text-destructive" : ""}`}
                dir="ltr"
              >
                <Icon name="clock" className="h-3.5 w-3.5" />
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                {String(remaining % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center py-6">
        <div key={safeStep} className={`w-full max-w-2xl rounded-xl p-8 shadow-xl ${anim}`} style={{ background: theme.cardBg }}>
          <div className={multi ? "space-y-8 divide-y divide-border" : ""}>
            {currentStep.map((q, i) => (
              <div key={q.id} className={multi && i > 0 ? "pt-6" : ""}>
                <QuestionCard
                  q={q}
                  value={answers[q.id]}
                  onChange={(v) => {
                    setAnswers((a) => ({ ...a, [q.id]: v }));
                    setError("");
                    maybeAutoAdvance(q, v);
                  }}
                  accent={accent}
                  index={i}
                  remaining={quotaRemaining[q.id]}
                />
              </div>
            ))}
          </div>
          {error && <p className="mt-4 font-medium text-destructive">{error}</p>}

          {/* حفظ ومتابعة لاحقًا */}
          {behavior.allowSaveResume && (
            <div className="mt-6 rounded-xl bg-black/5 p-3 text-sm">
              <button
                onClick={saveForLater}
                disabled={savingDraft}
                className="inline-flex items-center gap-1.5 font-medium disabled:opacity-60"
                style={{ color: accent }}
              >
                <Icon name="save" className="h-4 w-4" />
                {savingDraft ? "جارٍ الحفظ…" : "حفظ ومتابعة لاحقًا"}
              </button>
              {resumeUrl && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    احفظ هذا الرابط لمتابعة التعبئة لاحقًا (نُسخ تلقائيًا):
                  </p>
                  <input
                    readOnly
                    dir="ltr"
                    value={resumeUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="input mt-1 py-1.5 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            {behavior.allowBack !== false ? (
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-black/5"
              >
                <Icon name="arrow-right" className="h-4 w-4" /> السابق
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
              {submitting ? (
                "جارٍ الإرسال…"
              ) : safeStep === steps.length - 1 ? (
                <span className="inline-flex items-center gap-1.5">
                  إرسال <Icon name="check" className="h-4 w-4" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  التالي <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
                </span>
              )}
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
  remaining,
}: {
  q: FormDTO["questions"][number];
  value: any;
  onChange: (v: any) => void;
  accent: string;
  index: number;
  remaining?: Record<string, number>;
}) {
  if (q.type === "SECTION") {
    return (
      <div>
        {q.label && (
          <h2 className="text-2xl font-bold" style={{ color: accent }}>
            {q.label}
          </h2>
        )}
        {q.description && (
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{q.description}</p>
        )}
      </div>
    );
  }

  if (q.type === "IMAGE") {
    const url = q.config?.url;
    return (
      <div>
        {q.label && <h2 className="mb-3 text-xl font-bold">{q.label}</h2>}
        {url ? (
          <img
            src={url}
            alt={q.config?.caption || ""}
            className="mx-auto max-h-[420px] w-full rounded-xl object-contain"
          />
        ) : (
          <div className="grid h-48 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Icon name="image" className="h-10 w-10" />
          </div>
        )}
        {q.config?.caption && (
          <p className="mt-3 text-center text-sm text-muted-foreground">{q.config.caption}</p>
        )}
        {q.description && (
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{q.description}</p>
        )}
      </div>
    );
  }

  if (q.type === "VIDEO") {
    const embed = youtubeEmbed(q.config?.youtubeUrl);
    const fileUrl = q.config?.url;
    return (
      <div>
        {q.label && <h2 className="mb-3 text-xl font-bold">{q.label}</h2>}
        {embed ? (
          <iframe className="aspect-video w-full rounded-xl" src={embed} allowFullScreen />
        ) : fileUrl ? (
          <video src={fileUrl} controls className="w-full rounded-xl" />
        ) : (
          <div className="grid h-48 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Icon name="film" className="h-10 w-10" />
          </div>
        )}
        {q.config?.caption && (
          <p className="mt-3 text-center text-sm text-muted-foreground">{q.config.caption}</p>
        )}
        {q.description && (
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{q.description}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 text-sm font-medium" style={{ color: accent }}>
        سؤال {index + 1}
      </div>
      <h2 className="text-xl font-bold">
        {q.label}
        {q.required && <span className="mr-1 text-destructive">*</span>}
      </h2>
      {q.description && <p className="mt-1.5 text-sm text-muted-foreground">{q.description}</p>}
      <div className="mt-5">
        <QuestionInput
          question={q}
          value={value}
          onChange={onChange}
          accent={accent}
          remaining={remaining}
        />
      </div>
    </div>
  );
}
