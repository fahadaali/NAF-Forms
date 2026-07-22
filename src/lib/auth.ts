// طبقة مصادقة متوافقة مع Node و Cloudflare Workers (تعتمد Web Crypto فقط).
// - تجزئة كلمات المرور عبر PBKDF2-SHA256
// - جلسات موقّعة عبر HMAC-SHA256 مخزّنة في كوكي httpOnly

const enc = new TextEncoder();
const dec = new TextDecoder();

// تحويل Uint8Array إلى ArrayBuffer صريح (متوافق مع أنواع Web Crypto الحديثة)
function ab(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ===== كلمات المرور =====
const ITERATIONS = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", ab(enc.encode(password)), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: ab(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2$${ITERATIONS}$${toB64url(salt)}$${toB64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const salt = fromB64url(saltB64);
    const key = await crypto.subtle.importKey("raw", ab(enc.encode(password)), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: ab(salt), iterations: Number(iterStr), hash: "SHA-256" },
      key,
      256
    );
    const a = toB64url(new Uint8Array(bits));
    // مقارنة ثابتة الزمن
    if (a.length !== hashB64.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ hashB64.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

// ===== الجلسات =====
export interface Session {
  uid: string;
  role: string;
  mustChange: boolean;
  exp: number; // ثوانٍ منذ الحقبة
}

function secret(): string {
  return process.env.SESSION_SECRET || "naf-dev-session-secret-change-me";
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ab(enc.encode(secret())),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(
  data: Omit<Session, "exp">,
  ttlSeconds = 60 * 60 * 24 * 30
): Promise<string> {
  const payload: Session = { ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = toB64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), ab(enc.encode(body)));
  return `${body}.${toB64url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token || !token.includes(".")) return null;
  try {
    const [body, sigB64] = token.split(".");
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      ab(fromB64url(sigB64)),
      ab(enc.encode(body))
    );
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(fromB64url(body))) as Session;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "naf_session";
export const DEFAULT_PASSWORD = "1234";
