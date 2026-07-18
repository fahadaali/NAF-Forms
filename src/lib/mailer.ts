import nodemailer from "nodemailer";

// إرسال بريد عبر SMTP إن كان مُعدًّا في متغيرات البيئة، وإلا يُتجاهل بهدوء.
// المتغيرات: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
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
