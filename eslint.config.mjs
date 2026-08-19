import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

/* إعداد ESLint.
 *
 * لم يكن في المستودع إعداد أصلًا — لا `.eslintrc*` ولا `eslint.config.*` —
 * فكان `npm run lint` يدخل في معالج إعداد تفاعلي ويخرج بـ1. أي أن لا فحص
 * أنماط يعمل هنا، ولا في أي تكامل مستمر يستدعيه.
 *
 * وقاعدة `react-hooks/exhaustive-deps` مرفوعة إلى تحذير لا مطفأة: هي
 * بالضبط ما كان سيكشف خللَي الإغلاق القديم في `FormBuilder` (لقطة التراجع
 * ومستمع لوحة المفاتيح)، وقد أُسكتت في ستة مواضع بـ`eslint-disable`.
 * المواضع الباقية مقصودة وموثَّقة سطرًا سطرًا.
 */
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // الطبقة فوق D1 تتعامل مع صفوف بلا أنواع مولّدة، و`any` فيها مقصود
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "warn",

      /* `<img>` مقصود في هذه المنصة.
         الصور هنا مصدرها ثلاثة: مرفقات R2 يرفعها معبّئ النموذج، وروابط
         خارجية يكتبها صاحب النموذج، ورموز QR بصيغة `data:`. و`next/image`
         يحتاج مُحسِّنًا لا يعمل على Workers افتراضًا، ويعترض على النطاقات
         غير المصرَّح بها — أي أنه يكسر الحالات الثلاث. */
      "@next/next/no-img-element": "off",

      /* نزعُ مفتاح بالتفكيك (`const { secret, ...rest } = obj`) اصطلاحٌ
         مقصود لإسقاط حقل، والمتغيّر المنزوع لا يُستعمل بطبيعته. */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    /* `require` الديناميكي في طبقة قاعدة البيانات وإعداد PostCSS/Next.
       في `lib/db.ts` هو ما يمنع تجميع better-sqlite3 — وهي وحدة Node
       أصلية — في حزمة Workers. واستيرادٌ ساكن يجرّها إلى الحزمة فيفشل
       البناء. والملفان الآخران بصيغة CommonJS بطبيعتهما. */
    files: ["src/lib/db.ts", "*.js", "*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default config;
