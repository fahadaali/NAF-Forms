// عميل naf-id — الحارس.
//
// إضافة مسار الاستقبال لا تُنشئ حارساً: المركز يقول من الزائر وإن له حقّ
// الدخول، ولا يقف بين المنصة والشبكة. فما لم يُغلق الباب هنا بقيت المنصة
// تعرض محتواها لزائرٍ لم يبادل رمزاً قطّ.

import { authKv, isPublicPath, REASONS, type DeniedReason, type NafIdConfig } from "./config";
import { deniedResponse, sessionKey, startLogin, type PlatformSession } from "./handshake";
import { getMember, type Member } from "./members";
import { readCookie } from "./safe";
import { verifyToken } from "./verify";

export type { Claims } from "./verify";
export type { Member } from "./members";
export type { NafIdConfig, DeniedReason } from "./config";
export { nafIdConfig, isPublicPath, authKv, REASONS, SESSION_TTL_SECONDS } from "./config";
export {
  handleCallback,
  reportAccessChange,
  startLogin,
  deniedResponse,
  sessionKey,
} from "./handshake";
export { getMember, memberEmail, upsertMember } from "./members";
export { safeNext, clearCookie, readCookie } from "./safe";
export { verifyToken } from "./verify";

export type AuthResult =
  | { kind: "public" }
  | { kind: "login"; response: Response }
  | { kind: "denied"; response: Response; reason: DeniedReason }
  | { kind: "user"; user: Member; sub: string };

/**
 * الحارس. يعيد إمّا مروراً، وإمّا استجابةً جاهزة، وإمّا المستخدم.
 * لا يكتب في الاستجابة بنفسه ليصلح للوسيط ولمسار على حدّ سواء.
 */
export async function authenticate(
  request: Request,
  env: Record<string, unknown>,
  config: NafIdConfig
): Promise<AuthResult> {
  const url = new URL(request.url);

  if (isPublicPath(url.pathname, config)) return { kind: "public" };

  const sid = readCookie(request, config.cookieName);
  if (!sid) return { kind: "login", response: startLogin(request, config) };

  const kv = authKv(env);
  const session = (await kv.get(sessionKey(sid), "json")) as PlatformSession | null;

  // الجلسة المنتهية تعود إلى المركز ولا تجدّد نفسها، وإلا بقي الموقوف
  // مركزياً يدخل حتى ينقضي كوكيه.
  if (!session || !session.sub || !session.token) {
    return { kind: "login", response: startLogin(request, config) };
  }

  // التوقيع و`exp` في كل طلب محمي لا عند الاستقبال وحده.
  // انتهاء الرمز يعيد الطلب إلى المركز: إن كانت جلسة المركز قائمة وحقُّ
  // الدخول باقياً عاد المستخدم بتحويلتين لا يشعر بهما، وإن كان قد أُوقف
  // وقف عند الباب — وهذا هو مدى الإيقاف المركزي.
  try {
    await verifyToken(session.token, env, config);
  } catch {
    await kv.delete(sessionKey(sid));
    return { kind: "login", response: startLogin(request, config) };
  }

  const member = await getMember(env, session.sub);
  if (!member) {
    return {
      kind: "denied",
      response: deniedResponse(config, REASONS.notMember),
      reason: REASONS.notMember,
    };
  }
  if (!member.isActive) {
    return {
      kind: "denied",
      response: deniedResponse(config, REASONS.inactive),
      reason: REASONS.inactive,
    };
  }

  return { kind: "user", user: member, sub: session.sub };
}
