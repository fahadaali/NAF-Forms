# دليل النشر على Cloudflare (D1 + R2)

هذا الدليل ينشر نظام ناف على **Cloudflare Workers** مع قاعدة **D1** وتخزين **R2**.
الخطوات المؤشَّرة بـ 🔐 تتطلّب حسابك على Cloudflare (لا يمكن تنفيذها نيابةً عنك).

> **ملخّص المعمارية:** التطبيق يعمل على Workers عبر `@opennextjs/cloudflare`.
> قاعدة البيانات = D1 (SQLite) عبر مُحوّل Prisma. الملفات = R2. الجلسات
> والتجزئة تستخدم Web Crypto (متوافقة مع Workers أصلًا).

---

## 0) المتطلبات
```bash
npm i -g wrangler        # أداة Cloudflare
wrangler login           # 🔐 يفتح المتصفّح لتسجيل الدخول لحسابك
node -v                  # يفضّل 20+
```

## ✅ جاهزية الكود
تمّت **ترقية Next.js إلى 15** ومواءمة كل التغييرات، وأُضيف مُحوّل
`@opennextjs/cloudflare` وإعداده (`open-next.config.ts`)، ووُصِّل:
- **Prisma ↔ D1** تلقائيًا (`src/lib/prisma.ts`): D1 على Workers، SQLite محليًا.
- **R2**: عبر ربط `BUCKET` على Workers أو مفاتيح S3 على أي مضيف Node.
- **المصادقة** عبر Web Crypto (متوافقة أصلًا).

سكربتات النشر جاهزة في `package.json`: `cf:build` · `cf:preview` · `cf:deploy`.

## 1) المُحوّل (مُثبّت مسبقًا)
`@opennextjs/cloudflare` موجود كـ devDependency. تأكّد فقط من التثبيت:
```bash
npm install
```

## 2) إنشاء قاعدة D1  🔐
```bash
wrangler d1 create naf-forms
```
انسخ `database_id` من المخرجات وضعه في `wrangler.toml` مكان `<D1_DATABASE_ID>`.

طبّق الهجرة (إنشاء الجداول) على D1:
```bash
# محليًا (لمحاكاة D1)
wrangler d1 execute naf-forms --local  --file=cloudflare/d1/0001_init.sql
# على السحابة
wrangler d1 execute naf-forms --remote --file=cloudflare/d1/0001_init.sql
```

## 3) إنشاء حاوية R2  🔐
```bash
wrangler r2 bucket create naf-forms-uploads
```
فعّل الوصول العام للحاوية (Public Development URL أو دومين مخصّص) من لوحة
Cloudflare، وضع الرابط في `R2_PUBLIC_URL`.

## 4) الأسرار والمتغيّرات  🔐
```bash
wrangler secret put SESSION_SECRET          # سلسلة عشوائية طويلة
# إن كنت سترفع الملفات عبر S3 API بدل ربط R2:
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID        # من R2 > Manage API Tokens
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET               # naf-forms-uploads
# اختياري لإشعارات البريد عبر مزوّد HTTP (انظر القسم «ملاحظات»)
```
والمتغيّرات غير السرّية (`FIRST_ADMIN_EMAIL`, `R2_PUBLIC_URL`) في `wrangler.toml`.

## 5) إنشاء أول حساب مسؤول في D1
شغّل هذا الأمر مرة واحدة (يُنشئ `fahad2ao@gmail.com` بكلمة المرور `1234`):
```bash
# ولّد التجزئة محليًا ثم أدرِجها في D1
node -e "import('./src/lib/auth.ts')" 2>/dev/null || true
```
> الأبسط: بعد النشر، شغّل سكربت الزرع مقابل D1، أو أدرِج الصف يدويًا:
```bash
wrangler d1 execute naf-forms --remote --command \
"INSERT INTO User (id,email,role,passwordHash,mustChangePassword,createdAt) \
 VALUES ('admin1','fahad2ao@gmail.com','admin','<HASH>',1,CURRENT_TIMESTAMP);"
```
لتوليد `<HASH>` لكلمة المرور 1234:
```bash
npx tsx -e "import('./src/lib/auth').then(a=>a.hashPassword('1234').then(console.log))"
```

## 6) ربط Prisma بـ D1 (تلقائي — لا يلزم تعديل)
`src/lib/prisma.ts` يكتشف بيئة Workers ويستخدم ربط `DB` تلقائيًا، ويعود إلى
SQLite محليًا. لا حاجة لأي تغيير.

## 7) البناء والنشر
```bash
npm run cf:build
npm run cf:preview     # تجربة محلية على وقت تشغيل Workers
npm run cf:deploy      # 🔐 النشر
```

---

## ملاحظات مهمّة (توافق وقت تشغيل Workers)
- **البريد (nodemailer):** لا يعمل على Workers (لا مقابس SMTP). إشعارات البريد
  تُتجاهل بهدوء إن لم تُضبط. للتفعيل على Workers استبدلها بمزوّد HTTP مثل
  **Resend** أو **MailChannels** داخل `src/lib/mailer.ts` (استدعاء `fetch`).
- **رفع الملفات:** يعمل عبر R2 تلقائيًا عند ضبط متغيّرات `R2_*` (طبقة
  `src/lib/storage.ts`). بديلًا يمكن استخدام ربط R2 الأصلي على Workers.
- **الجلسات/كلمات المرور:** تستخدم Web Crypto — متوافقة مع Workers دون تغيير.
- **التطوير المحلي:** يبقى كما هو (SQLite + قرص محلي) عبر `npm run dev`.

## التحقق بعد النشر
1. افتح الرابط → يُحوّلك إلى `/login`.
2. ادخل `fahad2ao@gmail.com` / `1234` → يطلب كلمة مرور جديدة.
3. من «المستخدمون» أضف حسابات بأدوارها.
4. أنشئ نموذجًا، وارفع ملفًا (يذهب إلى R2)، وأرسل ردًا.
