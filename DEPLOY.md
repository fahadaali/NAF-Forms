# دليل النشر على Cloudflare (D1 + R2 + KV)

هذا الدليل ينشر نظام ناف على **Cloudflare Workers** مع قاعدة **D1** وتخزين
**R2** ومساحة **KV** للدخول الموحّد. الخطوات المؤشَّرة بـ 🔐 تتطلّب حسابك
على Cloudflare (لا يمكن تنفيذها نيابةً عنك).

> **ملخّص المعمارية:** التطبيق يعمل على Workers عبر `@opennextjs/cloudflare`.
> قاعدة البيانات = D1 (SQLite) عبر طبقة استعلامات مباشرة في
> [`src/lib/db.ts`](./src/lib/db.ts) — **لا Prisma**. الملفات = R2.
> **المصادقة كلها في المركز** عبر حزمة `naf-auth`، وجلستها في KV.

---

## 0) المتطلبات

```bash
npm i -g wrangler        # أداة Cloudflare
wrangler login           # 🔐 يفتح المتصفّح لتسجيل الدخول لحسابك
node -v                  # يفضّل 20+
npm install
```

---

## 1) قاعدة D1 🔐

```bash
wrangler d1 create naf-forms
```

انسخ `database_id` من المخرجات وضعه في `wrangler.toml` مكان `<D1_DATABASE_ID>`.

### تطبيق الهجرات — **كلها بالترتيب، لا الأولى وحدها**

> هذه أخطر خطوة في الدليل. كان هنا سطرٌ واحد يطبّق `0001_init.sql` فقط،
> ومن اتّبعه حصل على منصة **لا يعمل فيها الدخول أصلًا**: بلا
> `0009_sso_members.sql` لا جدول `members`، فيسقط أول دخول بـ
> `callback_failed — no such table` (انظر سجلّ الأخطاء في `src/lib/sso.ts`).
> وبلا `0004`/`0005` لا أعمدة ملكية، وبلا `0006`-`0008` تسقط الزيارات
> والمسودّات ومراجعة الردود وسجلّ التسليم.

```bash
# محليًا (لمحاكاة D1)
for f in cloudflare/d1/*.sql; do
  wrangler d1 execute naf-forms --local --file="$f"
done

# على السحابة 🔐
for f in cloudflare/d1/*.sql; do
  wrangler d1 execute naf-forms --remote --file="$f"
done
```

**`0004_ownership_sessions.sql` وحده قد يفشل عند إعادة التشغيل** — فيه
`ALTER TABLE ADD COLUMN` وSQLite لا تدعم `IF NOT EXISTS` معه. الفشل بـ
`duplicate column name` متوقَّع ولا يضرّ: الأعمدة مضافة سلفًا. وبقية الملفات
آمنة للتكرار.

| الهجرة | ما تضيفه |
|---|---|
| `0001_init` | الجداول الأساسية: User · Project · Form · Question · Response · Answer |
| `0002_seed_admin` | أول صفّ مسؤول (بريد فقط — لا يُدخَل به، انظر §5) |
| `0003_seed_templates` | القوالب الجاهزة الأربعة |
| `0004_ownership_sessions` | أعمدة `ownerId` و`sessionVersion` |
| `0005_ownership_backfill` | إسناد ما أُنشئ قبل نظام الملكية + الفهارس |
| `0006_visits_drafts` | تحليلات الإكمال + حفظ ومتابعة لاحقًا |
| `0007_response_review` | مراجعة الردود (تتبّع المتقدمين) |
| `0008_webhook_log` | سجلّ التسليم الخارجي |
| `0009_sso_members` | **جدول `members` و`MemberLink` — بدونه لا دخول** |
| `0010_viewer_becomes_reader` | رفع من يحمل `viewer` اليوم إلى `editor` |

---

## 2) حاوية R2 🔐

```bash
wrangler r2 bucket create naf-forms-uploads
```

الربط `BUCKET` مضبوط في `wrangler.toml` ويكفي وحده. وإن أردت رابطًا عامًّا
مباشرًا للمرفقات (بدل تقديمها عبر الـ Worker) فعّل Public Development URL أو
دومينًا مخصّصًا، وضع الرابط في `R2_PUBLIC_URL` داخل `[vars]`.

> بلا `R2_PUBLIC_URL` تُقدَّم المرفقات من `‎/uploads/<key>` عبر الـ Worker —
> وهو المسار الذي يفرض `attachment` و`nosniff`، أي **الأكثر أمانًا**.
> والرابط العام المباشر يتخطّاه، فلا تفعّله إلا لحاجة.

---

## 3) مساحة KV للدخول الموحّد 🔐

```bash
npx wrangler kv namespace create AUTH_KV
```

ضع المعرّف في `wrangler.toml` تحت `[[kv_namespaces]]`.

**لا تستعمل `--update-config`:** يضيف كتلة ثانية بجانب القائمة فيصير ربطان
باسم واحد والنشر يفشل.

---

## 4) الأسرار والمتغيّرات 🔐

### السرّ الوحيد اللازم للدخول

```bash
wrangler secret put AUTH_CLIENT_SECRET      # من مركز الهوية
```

> هذا السطر كان **غائبًا عن الدليل كلّه**، فلم يكن يمكن تشغيل الدخول
> باتّباعه. وبلا هذا السرّ يسجّل `logAuthError` السببَ `secret_missing`
> ويرى المستخدم `auth_failed` بلا تفصيل.

### المتغيّرات غير السرّية — في `wrangler.toml` تحت `[vars]`

| المتغيّر | القيمة | ملاحظة |
|---|---|---|
| `PLATFORM_ID` | `NAF-Forms` | **المقارنة حرفية**: حرف بحالة أخرى يجعل كل رمز صحيح يُرفض، والرفض صامت |
| `AUTH_ISSUER` | `https://app.naflaw.sa` | **بلا شرطة أخيرة** — `verifyToken` يقارن `iss` حرفيًا |
| `DEFAULT_ROLE` | `viewer` | صلاحية أول دخول لمن لا سجلّ تهيئة له |
| `FIRST_ADMIN_EMAIL` | بريد أول مسؤول | |
| `R2_PUBLIC_URL` | اختياري | انظر §2 |
| `NAF_TIMEZONE` | اختياري | افتراضه `Asia/Riyadh` — مرجع كل تاريخ ووقت |

### إشعارات البريد (اختياري)

nodemailer لا يعمل على Workers (لا مقابس SMTP)، فالبريد على كلاودفلير يمرّ
بمزوّد HTTP:

```bash
wrangler secret put RESEND_API_KEY
```

ومعه `MAIL_FROM` في `[vars]`. وبلا الاثنين تُتجاهل الإشعارات بهدوء
وتُسجَّل في اللوغ. (على مضيف Node تعمل متغيّرات `SMTP_*` كما كانت.)

### تخزين S3 بدل ربط R2 (لمضيف غير كلاودفلير)

```bash
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET
```

---

## 5) أول مسؤول

**لا يُنشأ حساب بكلمة مرور، ولا يُدخَل به.** الدخول كله من
`‎{AUTH_ISSUER}/go/NAF-Forms`، و`‎/api/login` يردّ ٤١٠ عمدًا.

فالخطوة هنا اثنتان:

1. **في المركز:** أضف صفّ وصول `granted` لبريد المسؤول على منصة `NAF-Forms`.
   بدونه يردّ المركز المبادلة بـ٤٠٣ ويصل المستخدمَ `auth_failed`.

2. **في هذه المنصة:** الهجرة `0002_seed_admin` تُسجّل بريد أول مسؤول سلفًا،
   فيُربط تلقائيًا عند أول دخول له ويأخذ صلاحية `admin`. ولإضافة غيره قبل
   أول دخول لهم، استعمل شاشة **«تهيئة مسبقة»** بعد دخولك.

> **الترتيب مهمّ:** من يدخل قبل أن يُسجَّل بريده يأخذ `DEFAULT_ROLE`
> (`viewer` — يقرأ ولا يكتب)، وتُرفع صلاحيته بعدها من «الفريق والصلاحيات».

---

## 6) البناء والنشر

```bash
npm run cf:build
npm run cf:preview     # تجربة محلية على وقت تشغيل Workers
npm run cf:deploy      # 🔐 النشر
```

---

## ملاحظات توافق وقت تشغيل Workers

- **البريد:** انظر §4. مسار HTTP يعمل على Workers، وnodemailer لمضيف Node.
- **رفع الملفات:** ربط R2 الأصلي (`BUCKET`) على Workers، وS3 على غيره،
  والقرص المحلي في التطوير. الطبقة في `src/lib/storage.ts`.
- **قاعدة البيانات:** ربط D1 الأصلي على Workers، وbetter-sqlite3 محليًا.
  الطبقة في `src/lib/db.ts` وتختار بنفسها.
- **حدّ المعدّل** في الذاكرة، ولكل معزولة نافذتها — يُبطئ الإساءة ولا
  يمنعها منعًا قاطعًا. المنع القاطع يحتاج عدّادًا مشتركًا (قرار منفصل).
- **التطوير المحلي:** `npm run dev` — ويحتاج `initOpenNextCloudflareForDev`
  ليقرأ روابط D1 وKV عبر miniflare، وهي مضبوطة في `next.config.js`.

---

## التحقق بعد النشر

1. افتح رابط المنصة → **يُحوّلك إلى مركز الهوية** (لا إلى `/login`).
2. ادخل بحسابك في المركز → يعود بك إلى الرئيسية.
3. افتح **«الفريق والصلاحيات»** → يجب أن تجد نفسك فيها بصلاحية «مسؤول».
   إن لم يظهر البند في الشريط الجانبي فصلاحيتك ليست `admin` في `members`.
4. أنشئ مشروعًا ثم نموذجًا، وانشره، وافتح رابط `‎/f/<slug>` في نافذة خاصة
   (بلا جلسة) → يجب أن يُفتح بلا تحويل إلى المركز.
5. ارفع ملفًا في النموذج (يذهب إلى R2) وأرسل ردًا.
6. افتح لوحة الردود → يجب أن يظهر الردّ **بتوقيت الرياض**، والمرفق يُنزَّل
   عند الضغط.
7. جرّب `‎/manifest.webmanifest` في نافذة خاصة → يجب أن يُقدَّم JSON لا أن
   يُحوَّل إلى المركز (وإلا تعطّل تثبيت التطبيق على الجوال).

### إن فشل الدخول

`src/lib/sso.ts` يسجّل السبب في اللوغ (`wrangler tail`):

| ما يُسجَّل | السبب |
|---|---|
| `secret_missing` | `AUTH_CLIENT_SECRET` غير مضبوط (§4) |
| `exchange_failed — … (401)` | السرّ خاطئ أو `PLATFORM_ID` لا يطابق |
| `exchange_failed — … (400)` | رمز عبور مستهلَك — ابدأ من `/` ولا تحدّث الصفحة |
| `exchange_failed — … (403)` | لا صفّ `granted` في `platform_access` بالمركز (§5) |
| `bad_issuer` / `bad_audience` | `AUTH_ISSUER` أو `PLATFORM_ID` لا يطابق حرفيًا |
| `callback_failed — no such table` | **هجرة `0009_sso_members` لم تُطبَّق** (§1) |
