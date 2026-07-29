import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام استبانات ناف",
  description: "منصة ناف لبناء الاختبارات والتقديم الوظيفي والاستبيانات والاستطلاعات",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
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
