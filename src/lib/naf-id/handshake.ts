// عميل naf-id — المصافحة.
//
// التدفّق كما نصّ عليه المركز:
//   المستخدم ──▶ /go/:platformId ──▶ مسار الاستقبال ومعه code و state
//                                     └──▶ POST /api/token خادماً لخادم
//
// السرّ لا يمرّ بالمتصفح إطلاقاً: المتصفح يحمل `code` يُستهلك مرة واحدة خلال
// ستين ثانية، والمنصة تبادله من خادمها.

import { AuthError, newSessionId, safeNext, sessionCookie } from "./safe";
import {
  authKv,
  REASONS,
  SESSION_TTL_SECONDS,
  type DeniedReason,
  type NafIdConfig,
} from "./config";
import { upsertMember } from "./members";
import { verifyToken, type Claims } from "./verify";

export interface PlatformSession {
  sub: string;
  token: string;
  createdAt: number;
}

function redirect(location: string, headers: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 302,
    headers: { location, "cache-control": "no-store", ...headers },
  });
}

export function deniedResponse(config: NafIdConfig, reason: DeniedReason): Response {
  return redirect(`${config.deniedPath}?r=${encodeURIComponent(reason)}`);
}

export function sessionKey(sid: string): string {
  return `sess:${sid}`;
}

/**
 * بدء الدخول: تحويل إلى باب المركز ومعه الوجهة المطلوبة.
 *
 * ولا تُولَّد حالة عابرة هنا: المركز هو من يولّد `state` ويخزّنه مع الرمز
 * ويطابقه عند المبادلة (انظر `functions/go/[id].js` و`functions/api/token.js`).
 * فحالةٌ من عندنا لا يحملها المركز ولا يعيدها، ومطابقتُها عند العودة تُسقط
 * كل دخول يبدأ من شبكة المركز — وهو التدفّق الأصلي.
 */
export function startLogin(request: Request, config: NafIdConfig): Response {
  const url = new URL(request.url);
  const next = safeNext(url.pathname + url.search);

  const target = new URL(`${config.issuer}/go/${encodeURIComponent(config.platformId)}`);
  if (next !== "/") target.searchParams.set("next", next);

  return redirect(target.toString());
}

/**
 * المبادلة — خادماً لخادم.
 *
 * السرّ لا يغادر هذه الدالة ولا يدخل رسالة خطأ ولا سجلّاً، ونصّ ردّ المركز
 * لا يُرفَق بالخطأ: قد يعيد المركز ما أُرسل إليه.
 *
 * ولا إعادة محاولة بالرمز نفسه مهما كان سبب الفشل: عمره ستون ثانية ويُستهلك
 * مرة واحدة — يُقرأ من KV ثم يُحذف فوراً عند المركز قبل أي تحقق آخر. فمحاولة
 * ثانية تفشل حتماً، وتبدو في السجلّ كأنها هجوم.
 */
async function exchangeCode(
  code: string,
  state: string,
  env: Record<string, unknown>,
  config: NafIdConfig
): Promise<{ token: string; next: string }> {
  const secret = env.AUTH_CLIENT_SECRET;
  if (typeof secret !== "string" || !secret) throw new AuthError("secret_missing");

  const res = await fetch(`${config.issuer}/api/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    // أسماء الحقول كما يقرؤها المركز حرفياً. وأي اسم آخر يعطي `invalid_body`.
    body: JSON.stringify({
      platformId: config.platformId,
      secret,
      code,
      state,
    }),
  });

  if (!res.ok) throw new AuthError("exchange_failed", `المركز رفض المبادلة (${res.status})`);

  const body = (await res.json().catch(() => null)) as {
    token?: unknown;
    next?: unknown;
  } | null;

  if (!body || typeof body.token !== "string" || !body.token) {
    throw new AuthError("exchange_malformed");
  }

  // الوجهة تُنقّى هنا ولا يُكتفى بأن المركز فحصها.
  return { token: body.token, next: safeNext(body.next) };
}

/**
 * مسار الاستقبال.
 *
 * الترتيب: المبادلة، ثم التحقق الكامل، ثم العضو، ثم الجلسة، ثم التحويل.
 * ويعيد `Response` دائماً.
 */
export async function handleCallback(
  request: Request,
  env: Record<string, unknown>,
  config: NafIdConfig,
  onClaims?: (claims: Claims, env: Record<string, unknown>) => Promise<void>
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // بلا رمز: زائر وصل إلى المسار مباشرة — يُعاد إلى باب المركز.
  if (!code) return startLogin(request, config);

  // `state` يُعاد كما وصل. المركز يطابقه ويرفض عند الاختلاف، فغيابه فشلٌ
  // محقّق ولا يُرسَل طلبٌ يستهلك رمزاً صالحاً بلا فائدة.
  if (!state) return deniedResponse(config, REASONS.authFailed);

  try {
    const { token, next } = await exchangeCode(code, state, env, config);
    const claims = await verifyToken(token, env, config);

    // نقطة التعليق بين التحقق والإدراج: منصةٌ لها أعضاء سابقون تطابق هنا
    // العضو القادم بسجلّه المحلي قبل أن يُنشأ له سجلّ ثانٍ.
    if (onClaims) await onClaims(claims, env);

    const member = await upsertMember(env, config, claims);

    // الموقوف محلياً يُحوَّل إلى الرفض ولا تُفتح له جلسة.
    if (!member) return deniedResponse(config, REASONS.notMember);
    if (!member.isActive) return deniedResponse(config, REASONS.inactive);

    const sid = newSessionId();
    const session: PlatformSession = {
      sub: claims.sub,
      token,
      createdAt: Math.floor(Date.now() / 1000),
    };

    await authKv(env).put(sessionKey(sid), JSON.stringify(session), {
      expirationTtl: SESSION_TTL_SECONDS,
    });

    return redirect(next, {
      "set-cookie": sessionCookie(config.cookieName, sid, SESSION_TTL_SECONDS),
    });
  } catch (err) {
    const code = err instanceof AuthError ? err.code : "callback_failed";
    // الرمز للسجلّ، والمعروض للمستخدم مصطلح مسجَّل لا تفصيل تقني.
    console.error("naf-id callback", code);
    return deniedResponse(config, REASONS.authFailed);
  }
}

/**
 * التبليغ العكسي.
 *
 * حين تُوقف المنصة عضواً في إعداداتها، تبلّغ المركز فيوافق جدولُ الوصول ما
 * تراه — وإلا بقيت بطاقتها تدعو المستخدم إلى باب لا يفتح.
 *
 * والمركز يعرف الأعضاء بالبريد لا بمعرّف المنصة، فالبريد هو ما يُرسل.
 */
export async function reportAccessChange(
  env: Record<string, unknown>,
  config: NafIdConfig,
  input: { email: string; state: "granted" | "revoked"; reason?: string }
): Promise<void> {
  const secret = env.AUTH_CLIENT_SECRET;
  if (typeof secret !== "string" || !secret) throw new AuthError("secret_missing");

  const res = await fetch(`${config.issuer}/api/internal/access`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      platformId: config.platformId,
      secret,
      email: input.email,
      state: input.state,
      ...(input.reason ? { reason: input.reason } : {}),
    }),
  });

  if (!res.ok) throw new AuthError("access_report_failed", `تعذّر تبليغ المركز (${res.status})`);
}
