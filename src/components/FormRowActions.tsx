"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { apiFetch } from "@/lib/api-client";

export default function FormRowActions({
  formId,
  slug,
}: {
  formId: string;
  slug: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState("");

  function copyLink() {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function duplicate() {
    setMenu(false);
    await apiFetch(`/api/forms/${formId}/duplicate`, { method: "POST" });
    router.refresh();
  }

  async function saveTemplate() {
    setMenu(false);
    await apiFetch(`/api/forms/${formId}/save-template`, { method: "POST" });
    setMsg("تم الحفظ كقالب");
    setTimeout(() => setMsg(""), 2000);
    router.refresh();
  }

  async function remove() {
    setMenu(false);
    if (!confirm("حذف هذا النموذج وجميع ردوده؟")) return;
    await apiFetch(`/api/forms/${formId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="relative flex items-center gap-1.5">
      {msg && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
          <Icon name="check-circle" className="h-4 w-4" /> {msg}
        </span>
      )}
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        title="نسخ رابط التقديم"
      >
        <Icon name={copied ? "check" : "link"} className="h-4 w-4" />
        {copied ? "تم النسخ" : "رابط"}
      </button>
      {/* الزرّ الوحيد في المنصة الذي كان بلا اسم مقروء: أيقونة نقاط بلا
          `aria-label` ولا `title`، فقارئ الشاشة يقول «زر» ولا يقول ماذا. */}
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label="خيارات أخرى"
        title="خيارات أخرى"
        aria-haspopup="menu"
        aria-expanded={menu}
        className="rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-muted"
      >
        <Icon name="more" className="h-4 w-4" />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute end-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 text-sm shadow-lg">
            <button
              onClick={duplicate}
              className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-muted"
            >
              <Icon name="copy" className="h-4 w-4" /> إنشاء نسخة
            </button>
            <button
              onClick={saveTemplate}
              className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-muted"
            >
              <Icon name="template" className="h-4 w-4" /> حفظ كقالب
            </button>
            <button
              onClick={remove}
              className="flex w-full items-center gap-2 px-4 py-2 text-start text-destructive hover:bg-destructive-soft"
            >
              <Icon name="trash" className="h-4 w-4" /> حذف
            </button>
          </div>
        </>
      )}
    </div>
  );
}
