import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام استبانات ناف",
  description: "منصة ناف لبناء الاختبارات والتقديم الوظيفي والاستبيانات والاستطلاعات",

  /* تطبيق الشاشة الرئيسية — الوثيقة في docs/naf-pwa.md.

     الحقلان معاً لا أحدهما: أندرويد يقرأ المانيفست ويتجاهل وسوم apple،
     وآيفون لا يقرأ أيقونات المانيفست إطلاقاً ولا يقرأ إلا `apple-touch-icon`
     — وهو ما يولّده Next من `icons.apple`. ومانيفستٌ كامل الأيقونات بلا ذلك
     الوسم يعطي آيفون لقطةً من الصفحة مكان الأيقونة.

     و`appleWebApp` هو ما يكتب `apple-mobile-web-app-*`: الهيئة بلا شريط
     عنوان، والاسم تحت الأيقونة، وشريط الحالة شفّافاً. و`display` في
     المانيفست لا يكفي على آيفون. */
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "الاستبانات",
    statusBarStyle: "black-translucent",
  },
};

/* `viewport-fit=cover` لازم مع شريط الحالة الشفّاف: بدونه يترك النظام
   شريطاً بلون الخلفية أعلى الشاشة بدل أن تمتدّ الصفحة تحت النتوء.

   ومنفصلٌ عن `metadata` لأن Next 14 فما فوق يرفضه بداخله ويطبع تحذيراً
   ثم يتجاهله — فيمرّ الخطأ صامتاً. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",

  /* ═══ `theme-color` بحالتيه — الاستثناء الرابع في القاعدة ١ ═══

     الوسم يأخذ لونًا حرفيًا ولا شيء غيره: لا متصفّح يحلّ `var()` بداخله.
     وهو الموضع الوحيد في هيكل التطبيق الذي يُكتب فيه لون خلفية باليد.

     وكان غائبًا كليًّا، فشريط المتصفّح على الجوال يأخذ لونًا يخمّنه —
     ويظهر فاتحًا فوق صفحة داكنة.

     والقيمتان مرآة `--background` في الوضعين، وتُحدَّثان معه. والمانيفست
     يحمل واحدة فقط (JSON لا يقبل استعلام وسائط)، فهذا الوسم هو ما يفرّق. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ebed" },
    { media: "(prefers-color-scheme: dark)", color: "#1c2433" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* `appleWebApp.capable` في `metadata` يُخرج `mobile-web-app-capable`
            — الاسم الحديث — ولا يُخرج الاسم المسبوق بـ`apple`. وآيفون يقرأ
            المسبوق، فبدونه تُضاف الصفحة إلى الشاشة الرئيسية ثم تُفتح في
            سفاري كاملاً بشريط عنوان وأزرار، لا في هيئة تطبيق.

            فيُكتب الوسم هنا صراحةً. وبقيةُ وسوم apple تأتي من `metadata`
            سليمةً — هذا وحده ما ينقص. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/* تثبيت المظهر قبل أول رسم لتفادي وميض التبديل.

            غياب المفتاح معناه «يتبع النظام» لا «الوضع الفاتح» — وهو العقد
            المسجَّل في naf-theme-toggle. كان السطر يفحص 'dark' وحدها، فقارئٌ
            نظامه داكن ولم يختر شيئاً يُفتح له الفاتح ثم يقفز إلى الداكن حين
            يصل المكوّن، وهو الوميض نفسه الذي يمنعه هذا السطر. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var v=localStorage.getItem('naf-theme');if(v==='dark'||(v!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
