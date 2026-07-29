/* مُستبدَل — لم يعد مستهلَكاً.
   حالتان لا ثلاث: قارئٌ نظامه فاتح واختار «الوضع الفاتح» لا يجد طريقاً
   للعودة إلى «يتبع النظام». المُبدِّل المسجَّل في `@/naf/ui/theme-toggle`
   وهو العقد المعتمد (CLAUDE.md §٦). أُبقي الملف ولا يُستأنف استعماله. */

"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("naf-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="rounded-lg px-2.5 py-1.5 text-sm hover:bg-accent"
      title="تبديل الوضع الليلي"
      aria-label="تبديل الوضع الليلي"
    >
      <Icon name={dark ? "sun" : "moon"} className="h-5 w-5" />
    </button>
  );
}
