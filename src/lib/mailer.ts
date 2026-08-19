// إرسال البريد — بمسارين حسب البيئة، ولا شيء إن لم يُضبط واحد منهما.
//
// **لماذا مساران.** nodemailer يفتح مقبس SMTP، وWorkers لا تملك مقابس —
// فكانت إشعارات المنصة في الإنتاج تسقط صامتة بينما README يعلنها ميزة
// وتبويب التخصيص يعرض حقل «بريد الإشعار» بلا إشارة. الفشل الصامت في ميزة
// معلنة أسوأ من غيابها.
//
// فمسار HTTP أولاً — يعمل في البيئتين ويكفيه `fetch` بلا حزمة جديدة —
// وnodemailer بعده لمن يشغّل على مضيف Node بخادم SMTP قائم.
//
// المتغيّرات:
//   RESEND_API_KEY + MAIL_FROM            مزوّد HTTP (يعمل على Workers)
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM   مضيف Node

/**
 * تهريب نصّ قبل إدراجه في جسم HTML.
 *
 * جسم الإشعار كان يدرج بريد المستفيد وعنوان النموذج كما وصلا. والبريد
 * يكتبه من يعبّئ النموذج، فوسمٌ فيه يصل صندوق المشرف عاملًا.
 *
 * وهي هنا لا في موضع النداء: كل رسالة تُبنى في هذه المنصة تمرّ من هذا
 * الملف، فالتهريب عنده يشمل ما يُضاف بعد اليوم.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** قراءة متغيّر من البيئة — `process.env` يملؤه OpenNext من ربط Workers. */
function envVar(name: string): string {
  return (process.env as Record<string, string | undefined>)[name] || "";
}

export function isHttpMailConfigured(): boolean {
  return !!(envVar("RESEND_API_KEY") && envVar("MAIL_FROM"));
}

export function isSmtpConfigured(): boolean {
  return !!(envVar("SMTP_HOST") && envVar("SMTP_PORT"));
}

/** هل يُرسل البريد في هذه البيئة؟ تستعملها الشاشات لتقول الحقيقة للمشرف. */
export function isMailConfigured(): boolean {
  return isHttpMailConfigured() || isSmtpConfigured();
}

async function sendViaHttp(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${envVar("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: envVar("MAIL_FROM"),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error(`[mailer] فشل الإرسال عبر HTTP — ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mailer] فشل الإرسال عبر HTTP:", e);
    return false;
  }
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    // استيراد ديناميكي: الحزمة لا تُحمَّل على Workers أصلاً.
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: envVar("SMTP_HOST"),
      port: Number(envVar("SMTP_PORT")),
      secure: Number(envVar("SMTP_PORT")) === 465,
      auth: envVar("SMTP_USER")
        ? { user: envVar("SMTP_USER"), pass: envVar("SMTP_PASS") }
        : undefined,
    });
    await transport.sendMail({
      from: envVar("SMTP_FROM") || envVar("SMTP_USER"),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (e) {
    console.error("[mailer] فشل إرسال البريد:", e);
    return false;
  }
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  // HTTP أولاً: يعمل في البيئتين. وSMTP بعده لمضيف Node.
  if (isHttpMailConfigured()) return sendViaHttp(opts);
  if (isSmtpConfigured()) return sendViaSmtp(opts);
  console.warn("[mailer] لم يُضبط مزوّد بريد — تم تجاهل إرسال الإشعار.");
  return false;
}
