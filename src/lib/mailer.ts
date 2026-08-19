// إرسال بريد عبر SMTP إن كان مُعدًّا في متغيرات البيئة، وإلا يُتجاهل بهدوء.
// ملاحظة: nodemailer لا يعمل على Cloudflare Workers (لا مقابس SMTP)، لذا يُستورد
// ديناميكيًا داخل الدالة ويُتجاهل بأمان هناك. للتفعيل على Workers استبدله بمزوّد HTTP.
// المتغيرات: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
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

export function isMailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!isMailConfigured()) {
    console.warn("[mailer] SMTP غير مُعد — تم تجاهل إرسال الإشعار.");
    return false;
  }
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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
