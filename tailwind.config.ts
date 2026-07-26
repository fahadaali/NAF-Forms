import type { Config } from "tailwindcss";

/**
 * Tailwind 4 يعتمد إعدادًا داخل CSS، ورموز التصميم كلها تأتي من
 * `src/app/naf-theme.css` (سجلّ ناف). لم يبقَ في هذا الملف أي ثيم محلي:
 * حُذفت ألوان `brand.*` و `naf.50–900` و `ok/warn/bad` و `survey/exam/job`
 * والظلّان `glow` و `card` وعائلة الخط، لأن وجود مصدرَي حقيقة في مستودع
 * واحد أسوأ من غياب النظام (القاعدة ١).
 *
 * الحركات المستخدمة (`card-in` و `floaty`) عُرِّفت في `globals.css` عبر
 * `@theme`، والاستكشاف التلقائي يتولّى المسح فلا حاجة لـ `content`.
 *
 * الملف لم يُحذف لكنه لم يعد مُحمَّلًا: لا `@config` في `globals.css`.
 * يبقى شاهدًا على ما أُزيل حتى لا يُعاد بناؤه.
 */
const config: Config = {
  darkMode: "class",
  plugins: [],
};

export default config;
