// عميل naf-id — التحقق من الرمز الموقّع.
//
// عبر WebCrypto مباشرة وبلا اتصال بقاعدة المركز: المنصة تقرأ المفاتيح العامة
// وحدها، فلا تصير حياتها معلّقة بتوفّر المركز في كل طلب.

import { AuthError, base64UrlToBytes, base64UrlToText, textToBytes } from "./safe";
import {
  authKv,
  CLOCK_SKEW_SECONDS,
  JWKS_TTL_SECONDS,
  type NafIdConfig,
} from "./config";

/** الخوارزمية الوحيدة المقبولة. أي قيمة سواها تُرفض قبل أي عمل تعمية. */
const ALG = "RS256";

export interface Claims {
  sub: string;
  name?: string;
  email?: string;
  iss: string;
  aud: string | string[];
  iat?: number;
  exp: number;
  nbf?: number;
}

interface Jwk {
  kid?: string;
  kty?: string;
  alg?: string;
  n?: string;
  e?: string;
}

interface Jwks {
  keys: Jwk[];
}

function jwksUrl(issuer: string): string {
  return `${issuer}/.well-known/jwks.json`;
}

/**
 * جلب المفاتيح العامة مع التخبئة. `force` يتجاوزها.
 *
 * التخبئة خمس دقائق: أطول من ذلك يجعل التدوير يعطّل الدخول حتى تنقضي،
 * وأقصر يحمّل المركز طلباً في كل مصافحة.
 */
async function loadJwks(
  env: Record<string, unknown>,
  config: NafIdConfig,
  force = false
): Promise<Jwks> {
  const kv = authKv(env);
  const cacheKey = `jwks:${config.issuer}`;

  if (!force) {
    const cached = (await kv.get(cacheKey, "json")) as Jwks | null;
    if (cached && Array.isArray(cached.keys)) return cached;
  }

  const res = await fetch(jwksUrl(config.issuer), { headers: { accept: "application/json" } });
  if (!res.ok) throw new AuthError("jwks_unavailable");

  const jwks = (await res.json()) as Jwks;
  if (!jwks || !Array.isArray(jwks.keys)) throw new AuthError("jwks_malformed");

  await kv.put(cacheKey, JSON.stringify(jwks), { expirationTtl: JWKS_TTL_SECONDS });
  return jwks;
}

/** المركز ينشر مفتاحين دائماً للتدوير، فالاختيار بـ`kid` لا بالأول. */
function findKey(jwks: Jwks, kid: string): Jwk | null {
  return (
    jwks.keys.find((k) => k.kid === kid && k.kty === "RSA" && (!k.alg || k.alg === ALG)) ?? null
  );
}

function importKey(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: ALG, ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

function decodeJwt(token: string) {
  if (typeof token !== "string") throw new AuthError("token_malformed");
  const parts = token.split(".");
  if (parts.length !== 3) throw new AuthError("token_malformed");

  let header: { alg?: string; kid?: string };
  let payload: Claims;
  try {
    header = JSON.parse(base64UrlToText(parts[0]));
    payload = JSON.parse(base64UrlToText(parts[1]));
  } catch {
    throw new AuthError("token_malformed");
  }

  return {
    header,
    payload,
    signature: base64UrlToBytes(parts[2]),
    signingInput: textToBytes(`${parts[0]}.${parts[1]}`),
  };
}

/**
 * `aud` يُقارن بمعرّف المنصة مقارنةً حرفية — بلا تصغير ولا تطبيع.
 * منصةٌ تُطبّع اسمها ترفض كل رمز صحيح، والرفض صامت يصعب تشخيصه.
 */
function audienceMatches(aud: unknown, platformId: string): boolean {
  if (typeof aud === "string") return aud === platformId;
  if (Array.isArray(aud)) return aud.includes(platformId);
  return false;
}

/**
 * التحقق الكامل: التوقيع و`iss` و`aud` و`exp` معاً.
 *
 * يُستدعى في كل طلب محمي لا عند الاستقبال وحده: الرمز عمره ربع ساعة، وهذا
 * القِصَر هو ما يجعل الإيقاف المركزي يسري دون أن تسأل المنصةُ المركزَ.
 * وفحصُه مرة واحدة عند الباب يُبطل ذلك كله.
 */
export async function verifyToken(
  token: string,
  env: Record<string, unknown>,
  config: NafIdConfig
): Promise<Claims> {
  const { header, payload, signature, signingInput } = decodeJwt(token);

  // يُفحص قبل أي شيء: `none` و`HS256` بمفتاح عام هجومان معروفان على هذا الموضع.
  if (header.alg !== ALG) throw new AuthError("bad_alg");
  if (!header.kid) throw new AuthError("missing_kid");

  let jwks = await loadJwks(env, config);
  let jwk = findKey(jwks, header.kid);

  // `kid` غير معروف يعيد الجلب فوراً، وإلا تعطّلت المنصة حتى تنقضي التخبئة
  // عند كل تدوير مفاتيح.
  if (!jwk) {
    jwks = await loadJwks(env, config, true);
    jwk = findKey(jwks, header.kid);
  }
  if (!jwk) throw new AuthError("unknown_kid");

  const key = await importKey(jwk);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signingInput);
  if (!valid) throw new AuthError("bad_signature");

  // مقارنة حرفية بالمُصدِر المضبوط، لا تطبيع ولا قبول لصورتين.
  if (payload.iss !== config.issuer) throw new AuthError("bad_issuer");
  if (!audienceMatches(payload.aud, config.platformId)) throw new AuthError("bad_audience");

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number") throw new AuthError("missing_exp");
  if (now > payload.exp + CLOCK_SKEW_SECONDS) throw new AuthError("token_expired");
  if (typeof payload.nbf === "number" && payload.nbf > now + CLOCK_SKEW_SECONDS) {
    throw new AuthError("token_not_yet_valid");
  }
  if (typeof payload.iat === "number" && payload.iat > now + CLOCK_SKEW_SECONDS) {
    throw new AuthError("token_from_future");
  }

  if (!payload.sub || typeof payload.sub !== "string") throw new AuthError("missing_sub");

  return payload;
}
