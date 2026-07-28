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
import { authenticate, handleCallback, reportAccessChange } from "naf-auth";
import { ssoConfig } from "@/lib/sso";

const ISSUER = "https://naf-id.pages.dev";
const PLATFORM = "NAF-Forms";
const ORIGIN = "https://naf-forms.naflaw-sa.workers.dev";
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

// functions/go/[id].js — يتجاهل أي state يصله ويولّد واحدة من عنده.
let seq = 0;
function centerGo(url: string) {
  const u = new URL(url);
  const next = u.searchParams.get("next") || "/";
  seq += 1;
  const code = `CODE-${seq}`;
  const state = `STATE-${seq}`;
  centerKV.set(`code:${code}`, { userId: "user-1", platformId: PLATFORM, state, next });
  return { code, state, next };
}

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
  return Response.json({ token, tokenType: "Bearer", expiresIn: 900, next: raw.next ?? "/" });
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
  if (!["granted", "revoked"].includes(body.state)) {
    failures.push("access:invalid_state");
    return new Response("{}", { status: 400 });
  }
  accessRows.push({ email, state: body.state, reason: body.reason ?? null });
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
  if (q.startsWith("INSERT INTO members"))
    return {
      run: () => {
        const [id, name, email, role] = args;
        const existing = members.get(id);
        // ON CONFLICT DO UPDATE يمسّ الاسم والبريد وآخر ظهور فقط.
        if (existing) Object.assign(existing, { display_name: name, email });
        else members.set(id, { user_id: id, display_name: name, email, role, is_active: 1 });
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
  const { response } = await authenticate(R("/projects/p1"), env, config);
  const { code, state } = centerGo(response!.headers.get("location")!);

  const cb = await handleCallback(R(`/auth/callback?code=${code}&state=${state}`), env, config);
  assert.equal(failures.length, 0, `المركز رفض: ${failures.join()}`);
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get("location"), "/projects/p1");

  sessionCookie = cb.headers.get("set-cookie")!.split(";")[0];
  assert.match(sessionCookie, /^naf_sid=/);
  ok("التدفّق الكامل يمرّ ويعود إلى الوجهة المطلوبة");
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
  const { response } = await authenticate(R("/"), env, config);
  const { code, state } = centerGo(response!.headers.get("location")!);
  await handleCallback(R(`/auth/callback?code=${code}&state=${state}`), env, config);
  failures = [];
  const replay = await handleCallback(
    R(`/auth/callback?code=${code}&state=${state}`),
    env,
    config,
  );
  assert.equal(replay.headers.get("location"), "/denied?r=auth_failed");
  assert.deepEqual(failures, ["invalid_code"]);
  ok("إعادة استعمال رمز العبور تفشل عند المركز");
}

// -- ٨: حالة لا تطابق ما خزّنه المركز تُرفض --
{
  failures = [];
  const { response } = await authenticate(R("/"), env, config);
  const { code } = centerGo(response!.headers.get("location")!);
  const cb = await handleCallback(R(`/auth/callback?code=${code}&state=WRONG`), env, config);
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
  kvStore.set("sess:stale", JSON.stringify({ sub: "user-1", token: stale, exp: now - 600 }));
  const { user, response } = await authenticate(
    H("/api/forms", { cookie: "naf_sid=stale", "sec-fetch-mode": "cors" }),
    env,
    config,
  );
  assert.equal(user, undefined, "رمز منتهٍ لا يمرّ");
  assert.equal(response!.status, 401);
  assert.equal(kvStore.has("sess:stale"), false, "الجلسة تُمسح");
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
  kvStore.set("sess:other", JSON.stringify({ sub: "user-1", token: other, exp: now + 900 }));
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
    "sess:off",
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
  });

  // والمنح يُبلَّغ كما يُبلَّغ السحب، وإلا بقي الصفّ revoked ولم يعد العضو يدخل.
  await reportAccessChange(env, config, { email: "fahad2ao@gmail.com", state: "granted" });
  assert.deepEqual(failures, []);
  assert.equal(accessRows.at(-1).state, "granted");
  ok("التبليغ العكسي يُقبل في الاتجاهين ويكتب صفّ الوصول");
}

// -- ١٥: وجهة عدائية من ردّ المبادلة تُنقّى إلى الجذر --
{
  for (const hostile of ["//evil.sa", "/%2f%2fevil.sa", "/\\evil.sa", "https://evil.sa"]) {
    const { response } = await authenticate(R("/"), env, config);
    const { code, state } = centerGo(response!.headers.get("location")!);
    centerKV.get(`code:${code}`).next = hostile; // مركزٌ مخترَق يعيد وجهة عدائية
    const cb = await handleCallback(R(`/auth/callback?code=${code}&state=${state}`), env, config);
    assert.equal(cb.headers.get("location"), "/", `${hostile} خرج بالمستخدم`);
  }
  ok("وجهة عدائية من ردّ المبادلة تُنقّى إلى الجذر");
}

console.log(`\n${pass}/15 فحصاً مرّت.`);
