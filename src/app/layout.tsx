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
      <body className="antialiased">{children}</body>
    </html>
  );
}
