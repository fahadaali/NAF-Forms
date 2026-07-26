# الجرد العام — naf-forms

المرحلة ١. جرد فقط، **لم يُعدَّل أي كود**.

---

## ١. الإطار وطريقة التنسيق

| البند | القيمة |
|---|---|
| الإطار | Next.js `^15.5.21` (App Router) |
| React | `^18.3.1` |
| التنسيق | Tailwind CSS `^3.4.14` + `src/app/globals.css` |
| TypeScript | `^5.6.3` |
| الاستضافة | Cloudflare Workers عبر `@opennextjs/cloudflare` |
| قاعدة البيانات | Cloudflare D1 (SQL أصلي، بلا ORM) |
| `lucide-react` | ❌ **غير مثبَّت إطلاقًا** |
| `shadcn/ui` | ❌ غير مستخدم — لا `components.json` |

## ٢. الاتجاه واللغة

`src/app/layout.tsx:15` → `<html lang="ar" dir="rtl">` ✅ مضبوط صحيحًا.

## ٣. الوضع الداكن

| البند | الحالة |
|---|---|
| الوضع | `darkMode: "class"` في `tailwind.config.ts:5` |
| المتغيّرات | معرّفة يدويًا في `globals.css` (`--bg`, `--card`, `--fg`, `--muted`, `--border`, `--primary`…) |
| قواعد التجاوز | **17 قاعدة `.dark`** تعيد تعريف أصناف Tailwind بـ `!important` |
| المبدّل | `src/components/ThemeToggle.tsx` موجود ويعمل |

⚠️ الـ17 قاعدة `.dark …​ !important` أسلوب التفافي: تُصلح `text-slate-*` بالقوة بدل استخدام رموز دلالية. تسقط تلقائيًا عند الانتقال لثيم السجلّ.

## ٤. الأنظمة الموازية — الأهم في هذا الجرد

### أ) ثيم محلي كامل في `tailwind.config.ts`

```
colors.brand   → navy, cream, taupe, taupeDeep          (٤ قيم)
colors.naf     → 50…900                                  (٩ درجات)
colors.ok/warn/bad                                       (٣ دلالات)
colors.survey/exam/job                                   (٣ ألوان أنواع)
boxShadow.glow / boxShadow.card                          (ظلّان)
fontFamily.sans → var(--font-cairo)
keyframes + animation: card-in, floaty, shimmer
```

**١٩ رمز لون + ظلّان + عائلة خط** معرّفة محليًا. القاعدة ١ في `CLAUDE.md` صريحة: **يُحذف كليًا ولا يُدمج.**
مستخدم في **٩١ موضعًا** (`naf-*` و `brand-*`) — انظر `colors.md §٤`.

### ب) مجموعة أيقونات محلية في `src/components/ui/Icon.tsx`

- **٦١ أيقونة SVG** مكتوبة يدويًا داخل كائن `ICONS` وتُعرض عبر `dangerouslySetInnerHTML`.
- **خريطة ٢٦ نوع حقل → أيقونة** في `FIELD_ICON`.
- مكوّن تلميح `IconTip` محلي.

هذا **نظام موازٍ ثانٍ** يخالف «Lucide حصرًا». مستخدم في **١٤ ملفًا**.

**ملاحظة على أصلها:** هذه المجموعة أُنشئت في جلسة سابقة *بديلًا عن الإيموجي*. فالانتقال الآن هو من أيقونات محلية إلى Lucide، لا من إيموجي — وهذا يجعل جدول المطابقة أوضح لأن المعاني كانت قد استُخلصت مرة.

### ج) أصناف مكوّنات في `globals.css`

`.btn` `.btn-primary` `.btn-ghost` `.btn-danger` · `.card` · `.input` · `.label` · `.chip` (+ ٦ متغيّرات حالة) · `.glass` · `.grid-bg` · `.gradient-text`

**١٧ صنفًا** يقابلها في السجلّ `button` و `input` و `card` و `alert` — يجب استخدام مكوّنات السجلّ لا إعادة بنائها.

## ٥. مكوّنات الواجهة الموجودة، مجمّعة بوظيفتها

| الوظيفة | الملفات |
|---|---|
| **بنّاء النموذج** | `builder/FormBuilder.tsx` · `builder/QuestionEditor.tsx` · `builder/AddQuestionPalette.tsx` · `builder/DesignPanel.tsx` · `builder/OptionsEditor.tsx` · `builder/ImageOptionsEditor.tsx` · `builder/ShareTools.tsx` |
| **تعبئة النموذج** | `fill/FillForm.tsx` · `QuestionInput.tsx` · `MapPicker.tsx` · `StarRating.tsx` |
| **لوحة الردود** | `dashboard/ResponsesDashboard.tsx` |
| **تنقّل وهوية** | `Navbar.tsx` · `ThemeToggle.tsx` · `LogoutButton.tsx` |
| **إجراءات وحوارات** | `NewFormButton.tsx` · `CreateProjectButton.tsx` · `FormRowActions.tsx` · `ProjectSettings.tsx` · `UsersManager.tsx` · `PrintButton.tsx` |
| **أساسيات** | `ui/Icon.tsx` |

**٢٢ مكوّنًا.** لا يوجد مكوّن أساسي مشترك (زر/حقل/بطاقة) — كلها أصناف CSS.

## ٦. ملفات الشعار

| الملف | النوع | ملاحظة |
|---|---|---|
| `public/naf-logo.jpg` | JPEG · 152 كيلوبايت | ⚠️ صورة نقطية، مستخدمة في **٥ مواضع** |
| `src/app/icon.svg` | SVG · 390 بايت | أيقونة التبويب، بألوان hex مباشرة |

السجلّ يوفّر `naf-logo.svg` و `naf-logo-dark.svg` و `naf-mark.svg` و `naf-logo-mono.svg` + مكوّن `naf-logo`.
استبدال JPEG بالمكوّن يحلّ الوضوح والوضع الداكن معًا.

## ٧. الإيموجي المتبقية — تصحيح لتقرير سابق

سبق أن أبلغتُ في جلسة سابقة أنه «لم يتبقَّ أي إيموجي». **ذلك كان غير دقيق** — فحصي وقتها اعتمد قائمة رموز محدودة لا نطاقات Unicode. الفحص الدقيق يُظهر **٣٠ إيموجي/رمزًا فعليًا** في الواجهة:

| الملف | الرموز | يُعرض للمستخدم؟ |
|---|---|---|
| `lib/field-types.ts` | **٢٦ إيموجي** في حقل `icon:` | ❌ **بيانات ميتة** — لا موضع يقرأ `.icon` (تحقّقت) |
| `components/ThemeToggle.tsx:27` | `☀️` `🌙` | ✅ **نعم** |
| `components/LogoutButton.tsx:16` | `🚪` | ✅ **نعم** |
| `builder/QuestionEditor.tsx:885-886` | `🔀` ×2 | ✅ **نعم** |
| `builder/QuestionEditor.tsx:657` | `▾` | ✅ نعم (معاينة القائمة المنسدلة) |
| `builder/QuestionEditor.tsx:709` | `★` | ✅ نعم (معاينة التقييم) |
| `components/StarRating.tsx:36` | `★` | ✅ **نعم** (حقل التقييم الفعلي) |
| `dashboard/ResponsesDashboard.tsx:296` | `★` | ✅ نعم (تقييم المراجعة) |
| `components/QuestionInput.tsx:378,386` | `↑` `↓` | ✅ نعم (ترتيب العناصر) |
| `lib/types.ts:106` | `🎉` | ✅ **نعم** — داخل نص رسالة النجاح الافتراضية |

`←` و `→` في `DesignPanel.tsx` و التعليقات: بعضها نص تعليمات وبعضها تعليقات برمجية — تُفصَّل في جدول الأيقونات.

## ٨. مخالفات الاتجاه

**٣١ مخالفة** (بعد استبعاد النتائج الزائفة مثل `rounded-lg` و `border-red-*`):

| النمط | العدد |
|---|---|
| `text-right` | 18 |
| `left-*` | 4 |
| `pr-*` | 3 |
| `right-*` | 2 |
| `border-r` | 2 |
| `mr-*` | 1 |
| `text-left` | 1 |

### أكثر الملفات تركيزًا

| الملف | العدد |
|---|---|
| `dashboard/ResponsesDashboard.tsx` | 6 |
| `fill/FillForm.tsx` | 4 |
| `builder/QuestionEditor.tsx` | 4 |
| `QuestionInput.tsx` | 4 |
| `FormRowActions.tsx` | 4 |
| `builder/AddQuestionPalette.tsx` | 3 |
| `MapPicker.tsx` | 2 |
| `ui/Icon.tsx` · `builder/DesignPanel.tsx` · `NewFormButton.tsx` · `app/page.tsx` | 1 لكل واحد |

لا خصائص فيزيائية (`margin-left` / `left:`) في `globals.css` ✅.

## ٩. عزل الاتجاه للنصوص المختلطة

`dir="ltr"` مستخدم في مواضع البريد والروابط والأرقام، لكن **لا يوجد أي استخدام لعنصر `<bdi>`**.
القاعدة ٢ تُلزم بعزل كل رقم وتاريخ ومبلغ. هذا فرق يحتاج مسحًا مستقلًا في المرحلة ٤.

## ١٠. التنسيق والعملة

| البند | الحالة |
|---|---|
| مكتبة تنسيق مشتركة | ❌ لا `naf-format` — التنسيق داخلي في `lib/utils.ts` (`formatDateTime` بـ `Intl`) |
| العملة | ➖ **لا مبالغ في هذه المنصة** — لا رمز ريال ولا `Money` |
| التواريخ | `Intl.DateTimeFormat("ar-SA-u-ca-gregory")` — ميلادي، بلا هجري |
| الأرقام | غربية ✅ |

---

## ملخّص رقمي

| البند | العدد |
|---|---|
| مكوّنات الواجهة | **22** |
| أنظمة موازية | **3** (ثيم Tailwind · أيقونات محلية · أصناف مكوّنات CSS) |
| رموز لون محلية | **19** + ظلّان |
| أيقونات محلية | **61** (+ خريطة ٢٦ نوع حقل) |
| استخدامات أصناف ألوان Tailwind | **425** |
| استخدامات أصناف الثيم المحلي | **91** |
| قيم hex فريدة | **39** |
| مخالفات الاتجاه | **31** |
| إيموجي تُعرض للمستخدم | **~10 مواضع** |
| إيموجي بيانات ميتة | **26** (في `field-types.ts`) |
| استخدامات `<bdi>` | **0** |
| `lucide-react` | **غير مثبَّت** |
| قواعد `.dark !important` | **17** |
