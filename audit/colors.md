# جرد الألوان — naf-forms

المرحلة ١. جرد فقط، **لم يُعدَّل أي كود**.
النطاق: `src/**` و `tailwind.config.ts` و `public/**` و `src/app/icon.svg`.

---

## ١. قيم hex مباشرة

| القيمة | العدد | الملفات | الدور الظاهر |
|---|---|---|---|
| `#44528a` | 8 | `components/fill/FillForm.tsx`, `components/CreateProjectButton.tsx`, `components/MapPicker.tsx`, `components/QuestionInput.tsx`, `app/certificate/[responseId]/page.tsx`, `app/globals.css`, `app/api/projects/route.ts`, `lib/types.ts` | اللون الأساسي — قيمة `accent` الافتراضية للنماذج |
| `#2a3149` | 4 | `app/change-password/page.tsx`, `app/page.tsx`, `app/login/page.tsx`, `app/icon.svg` | كحلي الهوية — تدرّجات الخلفية والأيقونة |
| `#1c2338` | 4 | `app/change-password/page.tsx`, `app/globals.css`, `app/page.tsx`, `app/login/page.tsx` | نهاية تدرّج الخلفية الداكن |
| `#5566a6` | 3 | `components/dashboard/ResponsesDashboard.tsx`, `app/globals.css` | لون رسوم بيانية / `naf-500` |
| `#1c59f5` | 3 | `lib/repo.ts`, `lib/db.ts` | **قيمة افتراضية في قاعدة البيانات** لعمود `Project.color` |
| `#ffffff` / `#fff` | 4 | `app/globals.css` | خلفية بطاقة (فاتح) |
| `#f4f5f1` | 2 | `app/globals.css`, `lib/types.ts` | خلفية الصفحة (فاتح) |
| `#e9f1ec` | 2 | `app/globals.css`, `app/icon.svg` | كريمي الهوية |
| `#cf6b6b` | 2 | `app/globals.css` | حالة خطأ (`bad`) |
| `#262b3d` | 2 | `app/globals.css`, `lib/types.ts` | لون النص (فاتح) |
| `#000` / `#000000` | 3 | `app/globals.css` | أسود لطبقات الشفافية |
| `#64748b` | 1 | `app/api/forms/[id]/save-template/route.ts` | لون مشروع القوالب |
| `#0f172a` | 1 | `components/QuestionInput.tsx` | لون خط التوقيع على canvas |
| `#b4a78f` | 1 | `app/icon.svg` | بيج الهوية |
| `#f7f8f4`, `#e6e4db`, `#c2b49a`, `#a1906f`, `#9aa3ba`, `#8b7cc8`, `#7d8cc7`, `#6f7486`, `#6b7bc7`, `#6474b4`, `#4fa3a0`, `#3f9d78`, `#333c58`, `#232840`, `#222a42`, `#161b2b` | 1 لكل واحدة | `app/globals.css` غالبًا | متغيّرات الوضع الداكن ودرجات الهوية |
| `#f59e0b`, `#ef4444`, `#ec4899`, `#84cc16`, `#22c55e`, `#8b5cf6`, `#06b6d4` | 1 لكل واحدة | `components/dashboard/ResponsesDashboard.tsx` | لوحة `PIE_COLORS` للرسوم الدائرية |

**المجموع: 39 قيمة hex فريدة.**

## ٢. rgb / rgba / hsl

19 استخدامًا، كلها في `src/app/globals.css` تقريبًا (ظلال وطبقات شفافية).
المكرّرة كأساس: `rgba(85,102,166,·)` ×3 بشفافيات 0.08/0.14/0.28 · `rgba(207,107,107,·)` ×4 · `rgba(68,82,138,·)` ×2 · `rgba(180,167,143,·)` ×2 · `rgba(16,20,34,·)` ×2.
لا يوجد `hsl` ولا `hsla`.

## ٣. أصناف ألوان Tailwind الجاهزة

**425 استخدامًا** — أكبر كتلة تحتاج ترحيلًا إلى الرموز الدلالية.

| العائلة | العدد | الدور الظاهر | الرمز الدلالي المرشّح |
|---|---|---|---|
| `text-slate-*` | 171 | نص أساسي وثانوي وباهت | `text-foreground` / `text-muted-foreground` |
| `bg-slate-*` | 54 | خلفيات بطاقات وحقول | `bg-background` / `bg-muted` / `bg-card` |
| `border-slate-*` | 51 | حدود | `border-border` |
| `text-red-*` | 31 | خطأ وحذف والنجمة الإلزامية | `text-destructive` |
| `text-green-*` | 10 | نجاح | `text-success` |
| `bg-red-*` | 7 | خلفية خطر | `bg-destructive/10` |
| `text-amber-*` | 5 | تحذير | `text-warning` |
| `bg-green-*` | 4 | خلفية نجاح | `bg-success/10` |
| `divide-slate-*` | 3 | فواصل | `divide-border` |
| `bg-amber-*` | 3 | خلفية تحذير | `bg-warning/10` |
| `border-green-*` | 2 | حدود نجاح | — |
| `text-indigo-*`, `bg-indigo-*`, `border-red-*` | 3 | لوحة المنطق الشرطي | — |

## ٤. أصناف الثيم المحلي (نظام موازٍ)

**91 استخدامًا** لأصناف غير قياسية معرّفة محليًا:

| الصنف | العدد |
|---|---|
| `text-naf-600` | 24 |
| `bg-naf-50` | 15 |
| `border-naf-400` | 14 |
| `text-naf-700` | 12 |
| `bg-naf-600` | 6 |
| `ring-brand-taupe` | 4 |
| `border-naf-500` | 3 |
| `text-brand-taupe`, `text-brand-cream`, `ring-naf-200`, `border-naf-300`, `bg-naf-500` | 2 لكل واحد |
| `border-naf-600`, `border-brand-taupe` | 1 لكل واحد |

## ٥. ألوان مسمّاة

`white` ×32 · `currentColor` ×20 (سليم — أيقونات ترث اللون) · `transparent` ×7 · `black` ×6.

## ٦. ألوان ملفات SVG

`src/app/icon.svg`: `#2a3149` و `#e9f1ec` و `#b4a78f`.
`public/naf-logo.jpg` صورة نقطية (152 كيلوبايت) لا SVG — الشعار في السجلّ متاح كـ SVG.

---

## ٧. متقاربات — انحرافات عرضية محتملة

مجموعات متقاربة بصريًا تشير إلى قيم وُلدت بالاجتهاد لا بالقرار:

**أ) الكحلي الداكن — 6 قيم لغرض واحد**
`#2a3149` · `#232840` · `#222a42` · `#1c2338` · `#161b2b` · `#333c58`
كلها خلفيات/أسطح داكنة. الفروق بينها لا تُقرأ بصريًا.

**ب) الأزرق البنفسجي (سلّم `naf`) — 6 قيم**
`#5566a6` · `#6474b4` · `#6b7bc7` · `#7d8cc7` · `#44528a` · `#6f7486`
`#6b7bc7` و `#7d8cc7` و `#6474b4` متقاربة جدًا — ثلاث قيم لدور واحد.

**ج) البيج/الكريمي — 5 قيم**
`#b4a78f` · `#c2b49a` · `#a1906f` · `#e6e4db` · `#e9f1ec`

**د) الأزرق الأساسي المتعارض — تنبيه**
`#1c59f5` (افتراضي قاعدة البيانات) **لا ينتمي لهوية ناف إطلاقًا** — أزرق مشبع بينما الهوية كحلية. كل مشروع يُنشأ بلا لون صريح يأخذ هذه القيمة الغريبة.

**هـ) الأخضر/الأحمر مزدوج المصدر**
نجاح: `#3f9d78` (محلي) مع `text-green-*` (Tailwind) — مصدران للمعنى نفسه.
خطأ: `#cf6b6b` (محلي) مع `text-red-*` (Tailwind) — كذلك.

**و) لوحة الرسوم `PIE_COLORS`**
7 ألوان (`#f59e0b`, `#ef4444`, `#ec4899`, `#84cc16`, `#22c55e`, `#8b5cf6`, `#06b6d4`) من لوحة Tailwind الافتراضية، لا علاقة لها بهوية ناف.

---

## ملخّص رقمي

| البند | العدد |
|---|---|
| قيم hex فريدة | **39** |
| استخدامات rgba | **19** |
| استخدامات أصناف ألوان Tailwind | **425** |
| استخدامات أصناف الثيم المحلي | **91** |
| ألوان SVG | **3** |
| مجموعات متقاربة مرصودة | **6** |
