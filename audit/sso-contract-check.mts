// فحص عقد الدخول الموحّد لمنصة NAF-Forms.
//
// يشغّل **إعداد هذه المنصة الحقيقي** — `ssoConfig` من `src/lib/sso.ts`
// بقائمة مساراته العامة و`onClaims` كما هي — مقابل محاكاةٍ للمركز مكتوبة
// من مصدره حرفياً:
//
//   naf-id/functions/api/token.js
//   naf-id/functions/go/[id].js
//   naf-id/functions/api/internal/access.js
//
// بمنطق تحقّقها نفسه لا بما نتوقّعه منها. فما يمرّ هنا يمرّ لأن المركز
// يقبله، وما يسقط يسقط بالرمز الذي يردّه المركز بعينه.
//
// أصلُه `audit/sso-contract-check.mjs` في NAF-Accountant، وما اختلف:
//   - معرّف المنصة ونطاقها ومساراتها
//   - المنصة لها نظام مستخدمون قائم، فالمحاكاة تشمل جدولَي `"User"`
//     و`"MemberLink"` اللذين يقرؤهما `onClaims`
//   - يُشغَّل بـ`tsx` لأن الإعداد مكتوب بـTypeScript هنا لا بـJavaScript
//
// التشغيل:  npm run check:sso

import assert from "node:assert/strict";
import {
  authenticate,
  handleBackchannelLogout,
  handleCallback,
  isPublicPath,
  reportAccessChange,
} from "naf-auth";
/* أسماء مفاتيح KV واسم كوكي الربط تُستوردان من الحزمة لا تُكتبان هنا:
   المحاكاة تزرع جلساتٍ في KV مباشرةً، فلو كتبت الاسم بيدها ثم غيّرته
   الحزمة لمضت الفحوص تزرع في مكانٍ لا يقرؤه أحد — وتمرّ كلُّها. */
import { sessionKeyFor, userIndexKeyFor } from "naf-auth/safe";
import { bindCookieName } from "naf-auth/middleware";
import { ssoConfig } from "@/lib/sso";

const ISSUER = "https://app.naflaw.sa";
const PLATFORM = "NAF-Forms";
const ORIGIN = "https://forms.naflaw.sa";
const SECRET = "the-platform-secret";
const ALGO = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;

const b64 = (b: Uint8Array | string) => Buffer.from(b as any).toString("base64url");
const enc = (v: unknown) => b64(new TextEncoder().encode(JSON.stringify(v)));

const pair = (await crypto.subtle.generateKey(
  { ...ALGO, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
  true,
  ["sign", "verify"],
)) as CryptoKeyPair;
const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
const JWK = { kty: pub.kty, n: pub.n, e: pub.e, alg: "RS256", kid: "cur" };

/* ═══════════════ محاكاة المركز ═══════════════ */

const centerKV = new Map<string, any>();
const accessRows: any[] = [];
let failures: string[] = [];

async function signToken(claims: Record<string, unknown>) {
  const input = `${enc({ alg: "RS256", typ: "JWT", kid: "cur" })}.${enc(claims)}`;
  const sig = await crypto.subtle.sign(ALGO, pair.privateKey, new TextEncoder().encode(input));
  return `${input}.${b64(new Uint8Array(sig))}`;
}

// functions/go/[id].js — يتجاهل أي state يصله ويولّد واحدة من عنده،
// ويحفظ `bind` كما وصله ليعيده `/api/token` عند المبادلة.
let seq = 0;
function centerGo(url: string) {
  const u = new URL(url);
  const next = u.searchParams.get("next") || "/";
  const bind = u.searchParams.get("bind");
  if (bind !== null) assert.match(bind, /^[a-f0-9]{64}$/, `bind ليس تجزئة: ${bind}`);
  seq += 1;
  const code = `CODE-${seq}`;
  const state = `STATE-${seq}`;
  centerKV.set(`code:${code}`, { userId: "user-1", platformId: PLATFORM, state, next, bind });
  return { code, state, next, bind };
}

/** مقلبٌ يجعل المحاكاة مركزاً أقدم من الحزمة: لا يعرف `bind` ولا يعيده. */
let centerOmitsBind = false;

// functions/api/token.js — منطق التحقق كما هو مكتوب هناك.
async function centerToken(body: any) {
  const { platformId, secret, code, state } = body ?? {};
  if (
    typeof platformId !== "string" ||
    typeof secret !== "string" ||
    typeof code !== "string" ||
    typeof state !== "string"
  ) {
    failures.push("invalid_body");
    return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
  }
  // المقارنة حرفية ولا تُطبَّع — كما في المركز.
  if (platformId !== PLATFORM || secret !== SECRET) {
    failures.push("invalid_client");
    return new Response("{}", { status: 401 });
  }
  const raw = centerKV.get(`code:${code}`);
  centerKV.delete(`code:${code}`); // يُستهلك مرة واحدة، قبل أي تحقق آخر
  if (!raw) {
    failures.push("invalid_code");
    return new Response("{}", { status: 400 });
  }
  if (raw.platformId !== platformId) {
    failures.push("invalid_code");
    return new Response("{}", { status: 400 });
  }
  if (raw.state !== state) {
    failures.push("invalid_state");
    return new Response("{}", { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken({
    sub: "user-1",
    name: "فهد",
    email: "fahad2ao@gmail.com",
    iss: ISSUER,
    aud: PLATFORM,
    iat: now,
    exp: now + 900,
  });
  /* `bind` يعود كما وصل — والمركز الأقدم لا يعرف الحقل أصلاً، وتلك حالة
     `legacy_center` التي تُفحص أدناه بمحاكاةٍ تُسقطه. */
  return Response.json({
    token,
    tokenType: "Bearer",
    expiresIn: 900,
    next: raw.next ?? "/",
    ...(centerOmitsBind ? {} : { bind: raw.bind ?? null }),
  });
}

// functions/api/internal/access.js
function centerAccess(body: any) {
  const { platformId, secret } = body ?? {};
  if (typeof platformId !== "string" || typeof secret !== "string") {
    failures.push("access:invalid_body");
    return new Response("{}", { status: 400 });
  }
  if (platformId !== PLATFORM || secret !== SECRET) {
    failures.push("access:invalid_client");
    return new Response("{}", { status: 401 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    failures.push("access:invalid_body");
    return new Response("{}", { status: 400 });
  }
  /* الحالة اختيارية منذ أن صار المركز يقبل تبليغ الصلاحية وحدها — والدخول
     يبلّغ بها في كل مرة. وإلزامُها هنا يجعل المحاكاة تخالف المركز الحيّ،
     فيسقط الفحص على تدفّق يعمل في الإنتاج. */
  const hasState = body.state !== undefined && body.state !== null;
  if (hasState && !["granted", "revoked"].includes(body.state)) {
    failures.push("access:invalid_state");
    return new Response("{}", { status: 400 });
  }
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : null;
  if (!hasState && !role) {
    failures.push("access:invalid_body");
    return new Response("{}", { status: 400 });
  }

  accessRows.push({
    email,
    state: hasState ? body.state : null,
    reason: body.reason ?? null,
    role,
  });
  return Response.json({ ok: true });
}

globalThis.fetch = (async (url: any, init: any = {}) => {
  const href = String(url);
  const body = init.body ? JSON.parse(init.body) : null;
  if (href.endsWith("/.well-known/jwks.json")) return Response.json({ keys: [JWK] });
  if (href.endsWith("/api/token")) return centerToken(body);
  if (href.endsWith("/api/internal/access")) return centerAccess(body);
  return new Response("nf", { status: 404 });
}) as typeof fetch;

/* ═══════════════ بيئة المنصة ═══════════════ */

const kvStore = new Map<string, any>();
const kv = {
  async get(k: string, t?: string) {
    const v = kvStore.get(k);
    return v === undefined ? null : t === "json" ? JSON.parse(v) : v;
  },
  async put(k: string, v: string, o?: { expirationTtl?: number }) {
    kvStore.set(k, v);
    kvStore.set(`__ttl:${k}`, o?.expirationTtl);
  },
  /* `list` بصفحاتٍ صغيرة عمداً: KV الحقيقي يردّ صفحة محدودة ومعها مؤشّر،
     ومن قرأ الصفحة الأولى وحدها ظنّ أنه استوفى. */
  async list({ prefix = "", cursor, limit = 2 }: any = {}) {
    const all = [...kvStore.keys()].filter((k) => k.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) : 0;
    const slice = all.slice(start, start + limit);
    const end = start + slice.length;
    const complete = end >= all.length;
    return {
      keys: slice.map((name) => ({ name })),
      list_complete: complete,
      cursor: complete ? undefined : String(end),
    };
  },
  async delete(k: string) {
    kvStore.delete(k);
  },
};

// جدول الأعضاء ومعه الجدولان اللذان يقرؤهما `onClaims` في هذه المنصة.
const members = new Map<string, any>();
const memberLinks = new Map<string, { localUserId: string }>();
const legacyUsers = [{ id: "legacy-7", email: "fahad2ao@gmail.com", role: "admin" }];

function d1(sql: string, args: any[]) {
  const q = sql.replace(/\s+/g, " ").trim();

  if (q.startsWith('SELECT "user_id" FROM "MemberLink" WHERE "user_id"'))
    return { first: () => memberLinks.get(args[0]) ?? null };
  if (q.startsWith('SELECT "user_id" FROM "MemberLink" WHERE "localUserId"')) {
    const hit = [...memberLinks].find(([, v]) => v.localUserId === args[0]);
    return { first: () => (hit ? { user_id: hit[0] } : null) };
  }
  if (q.startsWith('SELECT "id", "role" FROM "User"'))
    return { first: () => legacyUsers.find((u) => u.email === args[0]) ?? null };
  if (q.startsWith('INSERT INTO "MemberLink"'))
    return {
      run: () => {
        if (!memberLinks.has(args[0])) memberLinks.set(args[0], { localUserId: args[1] });
      },
    };
  // الإدراج `ON CONFLICT DO NOTHING` في الموضعين — في `onClaims` وفي
  // `upsertMember` — فصفٌّ قائم لا يُمسّ منه شيء.
  if (q.startsWith("INSERT INTO members"))
    return {
      run: () => {
        const [id, name, email, role] = args;
        if (members.has(id)) return;
        members.set(id, { user_id: id, display_name: name, email, role, is_active: 1 });
      },
    };
  // والصفّ القائم يُحدَّث بجملة `UPDATE` مستقلّة تسمّي أعمدتها، فتُقرأ
  // أسماؤها من الجملة نفسها ولا يُفترض ترتيبٌ ولا عدد.
  if (q.startsWith("UPDATE members SET"))
    return {
      run: () => {
        const setClause = q.slice(q.indexOf(" SET ") + 5, q.indexOf(" WHERE "));
        const cols = setClause.split(",").map((part) => part.trim().split(" ")[0]);
        const row = members.get(args[args.length - 1]);
        if (!row) return;
        cols.forEach((col, i) => {
          row[col] = args[i];
        });
      },
    };
  // `getMember` يقرأ الأعمدة بأسمائها المستعارة، فتُعاد كما يقرؤها.
  if (q.startsWith("SELECT user_id AS id"))
    return {
      first: () => {
        const m = members.get(args[0]);
        return m
          ? { id: m.user_id, role: m.role, is_active: m.is_active, perms: m.perms ?? null }
          : null;
      },
    };

  throw new Error(`استعلام غير محاكى: ${q}`);
}

const DB = {
  prepare(sql: string) {
    let bound: any[] = [];
    const stmt = {
      bind(...a: any[]) {
        bound = a;
        return stmt;
      },
      async first() {
        const r = d1(sql, bound).first;
        return r ? r() : null;
      },
      async run() {
        const r = d1(sql, bound).run;
        return r ? r() : {};
      },
    };
    return stmt;
  },
};

const env: any = {
  AUTH_ISSUER: ISSUER,
  PLATFORM_ID: PLATFORM,
  AUTH_CLIENT_SECRET: SECRET,
  AUTH_KV: kv,
  DB,
};
const config = ssoConfig(env);

const R = (p: string, cookie?: string) =>
  new Request(`${ORIGIN}${p}`, cookie ? { headers: { cookie } } : undefined);
const H = (p: string, headers: Record<string, string>) => new Request(`${ORIGIN}${p}`, { headers });

let pass = 0;
const ok = (label: string) => {
  console.log(`  [ok] ${label}`);
  pass += 1;
};

/* المتصفّح يحمل ما كُتب له. و`startLogin` يكتب كوكي ربطٍ في ردّ التحويل،
   ويجب أن يعود مع الاستقبال — فبدونه يقرأ الحارسُ الطلبَ دخولاً لم يبدأ من
   هنا. وحارسٌ لا يُختبر إلا بلا كوكي يُختبر في فرعه الاحتياطي وحده. */
const setCookies = (response: Response): string[] =>
  typeof (response.headers as any).getSetCookie === "function"
    ? (response.headers as any).getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean) as string[];

const cookieJar = (response: Response) =>
  setCookies(response)
    .map((c) => c.split(";")[0])
    .filter((c) => !c.endsWith("="))       // ما مُحي لا يُحمل
    .join("; ");

/* عنوانُ الاستقبال كما يبنيه المركز: `functions/go/[id].js` يضيف `code`
   و`state`، ويضيف `next` إن لم يكن الجذر (السطر ١٢٧ هناك). وحذفُه من
   المحاكاة يُخفي أن لفّة الربط تقرأ الوجهة من عنوان الطلب لا من ردّ
   المبادلة — فتُقرأ اللفّة سليمةً وهي تُسقط وجهةَ صاحبها. */
const callbackUrl = ({ code, state, next }: { code: string; state: string; next?: string }) => {
  const q = new URLSearchParams({ code, state });
  if (next && next !== "/") q.set("next", next);
  return `/auth/callback?${q}`;
};

/** رحلةُ دخولٍ كاملة كما يمشيها متصفّح: الحارس ← المركز ← الاستقبال. */
async function browserLogin(path: string, opts: { tamper?: (rec: any) => void } = {}) {
  const { response: gate } = await authenticate(R(path), env, config);
  const goUrl = gate!.headers.get("location")!;
  const jar = cookieJar(gate!);
  const { code, state, next } = centerGo(goUrl);
  if (opts.tamper) opts.tamper(centerKV.get(`code:${code}`));
  const cb = await handleCallback(R(callbackUrl({ code, state, next }), jar), env, config);
  return { gate: gate!, goUrl, code, state, next, cb, jar };
}

/* ═══════════════ الفحوص ═══════════════ */

// -- ١: زائر بلا جلسة على الجذر يُردّ إلى المركز --
{
  const { response, user } = await authenticate(R("/"), env, config);
  assert.equal(user, undefined);
  assert.equal(response!.status, 302);
  assert.match(response!.headers.get("location")!, new RegExp(`^${ISSUER}/go/${PLATFORM}`));
  ok("الجذر محمي — زائر بلا جلسة يُردّ إلى المركز");
}

// -- ٢: المعرّف يمرّ بحالة أحرفه --
{
  const { response } = await authenticate(R("/forms/abc/edit"), env, config);
  const loc = response!.headers.get("location")!;
  assert.ok(loc.includes(`/go/${PLATFORM}`), loc);
  assert.ok(!loc.includes("/go/naf-forms"), "لا يُطبَّع إلى حروف صغيرة");
  ok("معرّف المنصة يمرّ بحالة أحرفه — NAF-Forms لا naf-forms");
}

// -- ٣: التدفّق الكامل عبر المركز، ويعود إلى الوجهة المطلوبة --
let sessionCookie: string;
{
  const { gate, goUrl, cb } = await browserLogin("/projects/p1");

  // الحارس يرسل تجزئةً إلى المركز، وسرَّها في كوكي لا يخرج من المتصفّح.
  assert.match(
    new URL(goUrl).searchParams.get("bind") ?? "", /^[a-f0-9]{64}$/,
    "الحارس لم يُرسل تجزئة الربط",
  );
  assert.ok(cookieJar(gate).includes(`${bindCookieName(config)}=`), "لم يُكتب كوكي الربط");

  assert.equal(failures.length, 0, `المركز رفض: ${failures.join()}`);
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get("location"), "/projects/p1");

  sessionCookie = setCookies(cb).map((c) => c.split(";")[0]).find((c) => c.startsWith("naf_sid="))!;
  assert.ok(sessionCookie, "لم يُكتب كوكي الجلسة");

  // وكوكي الربط يُمحى بعد استعماله — لا يُترك حتى ينتهي عمره.
  assert.ok(
    setCookies(cb).some((c) => c.startsWith(`${bindCookieName(config)}=;`) && /Max-Age=0/.test(c)),
    "كوكي الربط لم يُمحَ بعد الاستعمال",
  );
  ok("التدفّق الكامل يمرّ مربوطاً بالمتصفّح ويعود إلى الوجهة المطلوبة");
}

// -- ٤: عمر الجلسة لا يتجاوز عمر الرمز --
{
  const sid = [...kvStore.keys()].find((k) => k.startsWith("sess:"))!;
  const ttl = kvStore.get(`__ttl:${sid}`);
  assert.ok(ttl <= 900 && ttl > 800, `ttl=${ttl}`);
  ok(`عمر الجلسة ${ttl}s — لا يتجاوز عمر الرمز`);
}

// -- ٥: `onClaims` يربط صاحب البريد المسجَّل بسجلّه المحلي --
{
  assert.deepEqual(memberLinks.get("user-1"), { localUserId: "legacy-7" });
  assert.equal(members.get("user-1").role, "admin", "دوره القديم لا الافتراضي");
  ok("أول دخول يربط `sub` بالمستخدم القائم ولا يُنشئ سجلّاً ثانياً");
}

// -- ٦: الجلسة تفتح المسارات المحمية --
{
  const { user, response } = await authenticate(R("/api/forms", sessionCookie), env, config);
  assert.equal(response, undefined);
  assert.equal(user!.id, "user-1");
  ok("الجلسة تفتح المسارات المحمية");
}

// -- ٧: رمز العبور لا يُستهلك مرتين --
{
  const { code, state, next, jar } = await browserLogin("/");
  failures = [];
  const replay = await handleCallback(R(callbackUrl({ code, state, next }), jar), env, config);
  assert.equal(replay.headers.get("location"), "/denied?r=auth_failed");
  assert.deepEqual(failures, ["invalid_code"]);
  ok("إعادة استعمال رمز العبور تفشل عند المركز");
}

// -- ٨: حالة لا تطابق ما خزّنه المركز تُرفض --
{
  failures = [];
  const { response } = await authenticate(R("/"), env, config);
  const jar = cookieJar(response!);
  const { code } = centerGo(response!.headers.get("location")!);
  const cb = await handleCallback(R(`/auth/callback?code=${code}&state=WRONG`, jar), env, config);
  assert.equal(cb.headers.get("location"), "/denied?r=auth_failed");
  assert.deepEqual(failures, ["invalid_state"]);
  ok("حالة لا تطابق ما خزّنه المركز تُرفض");
}

// -- ٩: نداء برمجي بلا جلسة يردّ ٤٠١ ومعه عنوان الباب --
{
  const { response } = await authenticate(H("/api/forms", { "sec-fetch-mode": "cors" }), env, config);
  assert.equal(response!.status, 401);
  const body = (await response!.json()) as any;
  assert.match(body.login, new RegExp(`^${ISSUER}/go/${PLATFORM}`));
  ok("نداء fetch يردّ ٤٠١ ومعه عنوان الباب لا تحويلة");
}

// -- ١٠: رمز منتهٍ يُبطل الجلسة في كل طلب محمي --
{
  const now = Math.floor(Date.now() / 1000);
  const stale = await signToken({
    sub: "user-1",
    iss: ISSUER,
    aud: PLATFORM,
    iat: now - 1200,
    exp: now - 600,
  });
  const staleKey = await sessionKeyFor("stale");
  kvStore.set(staleKey, JSON.stringify({ sub: "user-1", token: stale, exp: now - 600 }));
  const { user, response } = await authenticate(
    H("/api/forms", { cookie: "naf_sid=stale", "sec-fetch-mode": "cors" }),
    env,
    config,
  );
  assert.equal(user, undefined, "رمز منتهٍ لا يمرّ");
  assert.equal(response!.status, 401);
  assert.equal(kvStore.has(staleKey), false, "الجلسة تُمسح");
  ok("رمز منتهٍ يُبطل الجلسة في كل طلب محمي");
}

// -- ١١: رمز صادر لمنصة أخرى يُرفض بـ aud --
{
  const now = Math.floor(Date.now() / 1000);
  const other = await signToken({
    sub: "user-1",
    iss: ISSUER,
    aud: "NAF-Accountant",
    iat: now,
    exp: now + 900,
  });
  kvStore.set(await sessionKeyFor("other"), JSON.stringify({ sub: "user-1", token: other, exp: now + 900 }));
  const { user } = await authenticate(R("/api/forms", "naf_sid=other"), env, config);
  assert.equal(user, undefined);
  ok("رمز صادر لمنصة أخرى يُرفض بـ aud");
}

// -- ١٢: قائمة المسارات العامة — وباب كلمة المرور خلف الحارس --
{
  for (const p of [
    "/auth/callback",
    "/denied",
    "/api/logout",
    "/api/upload",
    "/f/my-form",
    "/api/f/my-form/submit",
    "/uploads/abc.pdf",
    "/certificate/r1",
  ]) {
    const r = await authenticate(R(p), env, config);
    assert.equal(r.public, true, `${p} يجب أن يكون عاماً`);
  }
  for (const p of [
    "/",
    "/members",
    "/users",
    "/api/forms",
    "/api/members/x",
    "/api/login",
    "/api/change-password",
    "/login",
    "/change-password",
    "/api/v1/forms/f1/responses",
    "/some/brand/new/route",
  ]) {
    const r = await authenticate(R(p), env, config);
    assert.ok(r.response, `${p} يجب أن يكون محمياً`);
  }
  ok("قائمة المسارات العامة مضبوطة — وباب كلمة المرور والمفتاح الآلي خلف الحارس");
}

// -- ١٣: شكل الردّ يتبع طبيعة الطلب لا بادئة المسار --
{
  // تنقّلٌ إلى رابط تصدير تحت /api/ — تحويلة لا JSON، وإلا قرأ المستخدم نصّاً خاماً.
  const nav = await authenticate(
    H("/api/forms/f1/export", { "sec-fetch-mode": "navigate" }),
    env,
    config,
  );
  assert.equal(nav.response!.status, 302, "رابط تصدير يجب أن يُحوَّل");

  // ونداءُ fetch إلى المسار نفسه — رمز حالة وجسم يُقرأ.
  const call = await authenticate(
    H("/api/forms/f1/export", { "sec-fetch-mode": "cors" }),
    env,
    config,
  );
  assert.equal(call.response!.status, 401);

  // ورفضُ عضوٍ سُحب وصولُه على نداء برمجي: ٤٠٣ بجسم، لا تحويلة داخلية
  // يتبعها fetch بنجاح فيستقبل صفحة الواجهة نصّاً.
  const now = Math.floor(Date.now() / 1000);
  members.get("user-1").is_active = 0;
  kvStore.set(
    await sessionKeyFor("off"),
    JSON.stringify({
      sub: "user-1",
      token: await signToken({ sub: "user-1", iss: ISSUER, aud: PLATFORM, iat: now, exp: now + 900 }),
      exp: now + 900,
    }),
  );

  const denied = await authenticate(
    H("/api/forms", { cookie: "naf_sid=off", "sec-fetch-mode": "cors" }),
    env,
    config,
  );
  assert.equal(denied.response!.status, 403);
  assert.equal(denied.response!.headers.get("location"), null);
  const body = (await denied.response!.json()) as any;
  assert.equal(body.reason, "inactive");
  assert.equal(body.denied, "/denied?r=inactive");
  members.get("user-1").is_active = 1;

  ok("شكل الردّ يتبع طبيعة الطلب — والرفض البرمجي ٤٠٣ بجسم يُقرأ");
}

// -- ١٤: التبليغ العكسي بالتوقيع القائم — بالبريد لا بالمعرّف --
{
  failures = [];
  await reportAccessChange(env, config, { email: "Fahad2ao@Gmail.com", state: "revoked" });
  assert.deepEqual(failures, []);
  assert.deepEqual(accessRows.at(-1), {
    email: "fahad2ao@gmail.com",
    state: "revoked",
    reason: null,
    role: null,
  });

  // والمنح يُبلَّغ كما يُبلَّغ السحب، وإلا بقي الصفّ revoked ولم يعد العضو يدخل.
  await reportAccessChange(env, config, { email: "fahad2ao@gmail.com", state: "granted" });
  assert.deepEqual(failures, []);
  assert.equal(accessRows.at(-1).state, "granted");
  ok("التبليغ العكسي يُقبل في الاتجاهين ويكتب صفّ الوصول");
}

// -- ١٦: الدخول يبلّغ المركز بالصلاحية، بلا حالة --
//
// بدونه يبقى عمود الصلاحية في لوحة المركز فارغاً إلى الأبد: التبليغ اليدوي
// في مسارات إدارة الأعضاء وحدها، وكلها أفعال مسؤول لا أفعال عضو.
{
  failures = [];
  const before = accessRows.length;

  const { cb } = await browserLogin("/");
  assert.equal(cb.status, 302, "الدخول يجب أن ينجح");

  const reported = accessRows.slice(before);
  assert.equal(reported.length, 1, "الدخول يبلّغ مرة واحدة");
  assert.equal(reported[0].email, "fahad2ao@gmail.com");
  assert.equal(reported[0].role, members.get("user-1").role);
  // بلا حالة: الدخول لا يغيّر منحاً ولا سحباً، وكتابتها تمحو سحباً مركزياً.
  assert.equal(reported[0].state, null);
  assert.deepEqual(failures, []);

  ok("الدخول يبلّغ المركز بالصلاحية بلا حالة");
}

// -- ١٥: وجهة عدائية من ردّ المبادلة تُنقّى إلى الجذر --
{
  for (const hostile of ["//evil.sa", "/%2f%2fevil.sa", "/\\evil.sa", "https://evil.sa"]) {
    // مركزٌ مخترَق يعيد وجهة عدائية
    const { cb } = await browserLogin("/", { tamper: (rec) => { rec.next = hostile; } });
    assert.equal(cb.headers.get("location"), "/", `${hostile} خرج بالمستخدم`);
  }
  ok("وجهة عدائية من ردّ المبادلة تُنقّى إلى الجذر");
}

// -- ١٧: إشعار الخروج الخلفي — الخروج من المركز يُنهي الجلسة هنا --
{
  const now = Math.floor(Date.now() / 1000);
  const sid = "sid-backchannel";
  const sessKey = await sessionKeyFor(sid);
  kvStore.set(
    sessKey,
    JSON.stringify({
      sub: "user-1",
      token: await signToken({ sub: "user-1", iss: ISSUER, aud: PLATFORM, iat: now, exp: now + 900 }),
      exp: now + 900,
    }),
  );
  kvStore.set(await userIndexKeyFor("user-1", sid), "1");

  const notice = (body: unknown) =>
    new Request(`${ORIGIN}/auth/backchannel-logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  /* `purpose` مكتوبة نصّاً لا مستوردة: تغييرها في المركز أو في الحزمة دون
     الآخر يُبطل كل إشعار بلا رسالة تدلّ عليه، وهذا السطر هو ما يمسك ذلك. */
  const res = await handleBackchannelLogout(
    notice({
      logoutToken: await signToken({
        sub: "user-1", iss: ISSUER, aud: PLATFORM,
        purpose: "backchannel-logout", iat: now, exp: now + 60,
      }),
    }),
    env,
    config,
  );
  assert.equal(res.status, 200, "المركز رُدّ إشعارُه");
  const { ended } = (await res.json()) as { ended: number };
  assert.ok(ended >= 1, `لم يُنهَ شيء (${ended})`);
  assert.equal(kvStore.has(sessKey), false, "بقيت الجلسة بعد الإشعار");
  assert.deepEqual(
    [...kvStore.keys()].filter((k) => k.startsWith("usr:user-1:")),
    [],
    "بقي دليلُ جلسةٍ بعد الإشعار",
  );

  // ورمز الدخول لا يصلح إشعاراً — وهو يصل إلى مسار عامّ لا حراسة عليه.
  const asSession = await handleBackchannelLogout(
    notice({
      logoutToken: await signToken({
        sub: "user-1", iss: ISSUER, aud: PLATFORM, iat: now, exp: now + 900,
      }),
    }),
    env,
    config,
  );
  assert.equal(asSession.status, 401, "رمز جلسة قُبل إشعارَ خروج");

  // والمسار عامّ: المنادي هو المركز خادماً لخادم، ولا جلسة له هنا يُحرَس بها.
  assert.equal(isPublicPath("/auth/backchannel-logout", config), true, "المسار محروس");

  ok("إشعار الخروج الخلفي يُنهي الجلسة، ومساره عامّ، ورمز الدخول لا يصلح إشعاراً");
}

/* العدد يُتحقَّق منه لا يُطبع وحده: فحصٌ يسقط من الملف بحذفٍ أو بخطأ في دمج
   يبقى العدّاد معه أقلّ، وسطرٌ يقول «١٦/١٧» يُقرأ نجاحاً بلمحة عين. */
// -- ١٨: ربط الدخول بالمتصفّح — الحالات الأربع كلُّها --
//
// هجمةُ التثبيت: المهاجم يبدأ دخولاً بنفسه فيحصل على رمز عبورٍ صالح، ثم
// يدفع الضحيّة إلى `‎/auth/callback` به. فتُفتح في متصفّح الضحيّة جلسةٌ
// باسم المهاجم، وكلُّ ما تكتبه الضحيّة بعدها يقع في حساب المهاجم.
// والرمز صحيح والحالة صحيحة — فلا شيء قبل الربط يميّز الحالتين.
{
  // (أ) كوكي لا يطابق التجزئة العائدة: ردٌّ. هذا متصفّح الضحيّة.
  {
    failures = [];
    const { response } = await authenticate(R("/"), env, config);
    const { code, state, next } = centerGo(response!.headers.get("location")!); // تجزئةُ المهاجم
    const victim = `${bindCookieName(config)}=` + "f".repeat(64);               // سرُّ متصفّحٍ آخر
    const cb = await handleCallback(R(callbackUrl({ code, state, next }), victim), env, config);
    /* `bad_state` لا `auth_failed`: أكثرُ ما يقع هذا في لسان صاحبه لا في
       هجمة — بابان مفتوحان، فالثاني يكتب كوكياً فوق الأول ثم يعود الأول
       فلا يطابق. ونصُّها «انتهت جلسة دخولك. سجّل الدخول من جديد» ومعها
       زرُّ محاولةٍ تُجدي، وهو الصواب في الحالين. */
    assert.equal(cb.headers.get("location"), "/denied?r=bad_state", "كوكي مخالف مرّ");
    assert.equal(
      setCookies(cb).some((c) => c.startsWith("naf_sid=") && !/Max-Age=0/.test(c)), false,
      "فُتحت جلسة رغم اختلاف الربط",
    );
  }

  // (ب) رمزٌ مربوط بلا كوكي أصلاً: ردٌّ كذلك — لا يكفي ألّا يملك المهاجم سرّاً.
  {
    const { response } = await authenticate(R("/"), env, config);
    const { code, state, next } = centerGo(response!.headers.get("location")!);
    const cb = await handleCallback(R(callbackUrl({ code, state, next })), env, config);
    assert.equal(cb.headers.get("location"), "/denied?r=bad_state", "رمز مربوط بلا كوكي مرّ");
  }

  // (ج) مركزٌ أقدم لا يعرف `bind`: يُقبل الدخول كما كان — منصةٌ سبقت المركزَ
  //     في الترقية لا تنكسر. وهذا هو الفرع الذي يجعل هذا النشر آمناً بأي ترتيب.
  {
    centerOmitsBind = true;
    failures = [];
    const { cb } = await browserLogin("/projects/p1");
    centerOmitsBind = false;
    assert.equal(cb.status, 302);
    assert.equal(cb.headers.get("location"), "/projects/p1", "مركزٌ أقدم كسر الدخول");
    assert.deepEqual(failures, []);
  }

  // (د) دخولٌ بدأ من شبكة المركز — بطاقةٌ تقصد `‎/go/:id` مباشرةً، فلا كوكي
  //     ولا تجزئة. يُعاد البدء لفّةً واحدة إلى الوجهة المقصودة، لا إلى مسار
  //     الاستقبال ومعه رمزٌ استُهلك — وتلك تدور بلا نهاية.
  {
    const { code, state, next } = centerGo(`${ISSUER}/go/${PLATFORM}?next=/projects/p1`);
    const cb = await handleCallback(R(callbackUrl({ code, state, next })), env, config);
    assert.equal(cb.status, 302);
    const loc = new URL(cb.headers.get("location")!);
    assert.equal(loc.origin + loc.pathname, `${ISSUER}/go/${PLATFORM}`, "لم يُعَد البدء من المركز");
    assert.match(loc.searchParams.get("bind") ?? "", /^[a-f0-9]{64}$/, "العودة بلا تجزئة");
    assert.equal(loc.searchParams.get("next"), "/projects/p1", "ضاعت الوجهة في لفّة الربط");
    assert.ok(cookieJar(cb).includes(`${bindCookieName(config)}=`), "اللفّة لم تكتب الكوكي");
  }

  ok("الربط بالمتصفّح: مخالفٌ يُردّ، وغائبٌ يُردّ، ومركزٌ أقدم يمرّ، وبدءٌ من المركز يلتفّ لفّةً");
}

const EXPECTED = 18;
assert.equal(pass, EXPECTED, `عدد الفحوص ${pass} لا ${EXPECTED}`);
console.log(`\n${pass}/${EXPECTED} فحصاً مرّت.`);
