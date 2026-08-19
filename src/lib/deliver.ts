import { logDelivery } from "./repo";

// تسليم حمولة JSON إلى وجهة خارجية (Webhook أو Google Sheets) مع إعادة المحاولة
// وتسجيل النتيجة في سجل التسليم. لا يرمي استثناءً أبدًا حتى لا يفشل الإرسال
// بسبب وجهة خارجية معطّلة.
export interface DeliverResult {
  ok: boolean;
  status: number;
  attempts: number;
  error: string;
}

const TIMEOUT_MS = 5000;
const BACKOFF_MS = [0, 300, 900]; // ثلاث محاولات بتباطؤ تدريجي

/* ═══ الوجهة تُفحص قبل النداء ═══

   الرابط يكتبه محرّر النموذج، والنداء يخرج من خادمنا. فبلا فحص يصير حقلُ
   إعدادات أداةَ طلبٍ من داخل شبكتنا: `http://169.254.169.254/…` لبيانات
   المثيل، أو `file:`، أو خدمة داخلية لا تُبلَغ من الخارج.

   والمقبول `https` وحده — و`http` للتطوير المحلي على المضيف نفسه — مع
   منع العناوين المحجوزة صراحةً. */
const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|\[?::1\]?|0\.0\.0\.0|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

export function isDeliverableUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (PRIVATE_HOST.test(url.hostname)) return false;
  return true;
}

export async function deliverJson(
  url: string,
  payload: unknown
): Promise<DeliverResult> {
  let status = 0;
  let error = "";

  if (!isDeliverableUrl(url))
    return { ok: false, status: 0, attempts: 0, error: "وجهة غير مسموح بها" };

  for (let attempt = 1; attempt <= BACKOFF_MS.length; attempt++) {
    if (BACKOFF_MS[attempt - 1] > 0)
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        // `manual` لا `follow`: وجهةٌ عامة تُحوّل إلى عنوان داخلي تلتفّ
        // على الفحص أعلاه، والفحص يقع على الرابط الأول وحده.
        redirect: "manual",
      });
      clearTimeout(timer);
      status = res.status;
      if (res.ok) return { ok: true, status, attempts: attempt, error: "" };
      error = `HTTP ${res.status}`;
    } catch (e: any) {
      error = e?.name === "AbortError" ? "انتهت المهلة" : e?.message || "خطأ شبكة";
    }
  }
  return { ok: false, status, attempts: BACKOFF_MS.length, error };
}

// تسليم + تسجيل في سجل النموذج
export async function deliverAndLog(opts: {
  formId: string;
  responseId?: string;
  kind: "webhook" | "sheets";
  url: string;
  payload: unknown;
}): Promise<DeliverResult> {
  const result = await deliverJson(opts.url, opts.payload);
  await logDelivery({
    formId: opts.formId,
    responseId: opts.responseId || "",
    kind: opts.kind,
    url: opts.url,
    ok: result.ok,
    status: result.status,
    attempts: result.attempts,
    error: result.error,
  }).catch(() => {});
  return result;
}
