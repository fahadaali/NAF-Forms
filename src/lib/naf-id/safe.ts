// عميل naf-id — أدوات التنقية والتوليد.
//
// بلا تبعيات: WebCrypto وحده، فالملف يعمل في وسيط Next وفي مسار على Workers
// دون اختلاف.

/** محارف تحكّم تُحذف من ترويسة Location، فيصير المسار بعد التنقية غيرَه. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * الشروط الأربعة على `next` كما نصّت عليها وثيقة الربط: يبدأ بمائلة واحدة،
 * لا مائلتين، ولا نقطتين رأسيتين، ولا شرطة عكسية.
 *
 * - `//evil.example` عنوانٌ مطلق بلا مخطّط، فيخرج بالمستخدم من المنصة.
 * - `javascript:` و `data:` مخطّطان ينفّذان ولا يتنقّلان.
 * - `\evil.example` تطويه بعض المتصفحات إلى `//evil.example`، فيتجاوز شرط
 *   «لا مائلتين» حرفياً ثم يخرج بالمستخدم فعلياً.
 */
function looksSafe(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes(":")) return false;
  if (value.includes("\\")) return false;
  if (CONTROL_CHARS.test(value)) return false;
  return true;
}

/** يفكّ الترميز حتى يستقرّ. الأعمق من أربع طبقات لا سبب مشروع له. */
function decodeFully(value: string): string | null {
  let current = value;
  for (let round = 0; round < 4; round += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (decoded === current) return current;
    current = decoded;
  }
  return null;
}

/**
 * تنقية `next` — ولا يُكتفى بأن المركز فحصه.
 *
 * القيمة تصل من المركز في الرابط وتعود في ردّ المبادلة، وقد تُفكّ مرة أخرى
 * قبل استعمالها: فـ`/%2f%2fevil` يمرّ فحصاً ساذجاً ثم يصير `//evil` عند
 * التحويل — وهي الثغرة نفسها بخطوة إضافية. لذلك يُفحص الشكلان: كما وصل،
 * وكما سيؤول.
 *
 * وما لا يجتاز يُستبدل بالجذر ولا يُرفض الطلب: المقصود ألّا يُختطف المستخدم،
 * لا أن يُمنع دخوله.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "/";
  if (!looksSafe(value)) return "/";
  const settled = decodeFully(value);
  if (settled === null || !looksSafe(settled)) return "/";
  return value;
}

/** رمز عشوائي بالنظام السداسي عشري من مولّد آمن. */
export function randomToken(byteLength = 32): string {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** معرّف الجلسة عشوائي بالكامل، لا يُشتقّ من `sub` ولا من أي قيمة متوقَّعة. */
export function newSessionId(): string {
  return randomToken(32);
}

/**
 * كوكي الجلسة: HttpOnly و Secure و SameSite=Lax و Path=/ — وبلا `Domain`
 * مشترك، فنطاقٌ مشترك بين المنصات يجعل كوكي منصةٍ صالحاً في أختها.
 *
 * و`SameSite=Lax` لا `Strict`: الوصول يأتي تحويلاً من نطاق المركز، و`Strict`
 * يحجب الكوكي في أول طلب بعد التحويل فتدور المنصة على نفسها بلا نهاية.
 */
export function sessionCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearCookie(name: string): string {
  return `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** قراءة كوكي بالتقسيم لا بتعبير نمطي — اسم الكوكي لا يُقحَم في نمط. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * فكّ base64url إلى بايتات.
 *
 * النوع `Uint8Array<ArrayBuffer>` صراحةً لا `Uint8Array` وحدها: الأخيرة قد
 * تحمل `SharedArrayBuffer`، و`crypto.subtle.verify` لا تقبله. والتصريح هنا
 * أوضح من تحويل نوعٍ عند كل استدعاء.
 */
export function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const normalised = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised + "=".repeat((4 - (normalised.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/** النصّ بايتاتٍ بترميز UTF-8، بالنوع نفسه ولنفس السبب. */
export function textToBytes(input: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(input);
  const out = new Uint8Array(new ArrayBuffer(encoded.length));
  out.set(encoded);
  return out;
}

/** فكّ base64url إلى نصّ UTF-8. */
export function base64UrlToText(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

/** خطأ برمز ثابت. الرمز للسجلّ، ولا يُعرض للمستخدم كما هو. */
export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message || code);
    this.name = "AuthError";
    this.code = code;
  }
}
