"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

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
    await fetch(`/api/forms/${formId}/duplicate`, { method: "POST" });
    router.refresh();
  }

  async function saveTemplate() {
    setMenu(false);
    await fetch(`/api/forms/${formId}/save-template`, { method: "POST" });
    setMsg("تم الحفظ كقالب");
    setTimeout(() => setMsg(""), 2000);
    router.refresh();
  }

  async function remove() {
    setMenu(false);
    if (!confirm("حذف هذا النموذج وجميع ردوده؟")) return;
    await fetch(`/api/forms/${formId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="relative flex items-center gap-1.5">
      {msg && <span className="text-xs font-medium text-green-600">{msg}</span>}
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        title="نسخ رابط التقديم"
      >
        <Icon name={copied ? "check" : "link"} className="h-4 w-4" />
        {copied ? "تم النسخ" : "رابط"}
      </button>
      <button
        onClick={() => setMenu((m) => !m)}
        className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
      >
        <Icon name="more" className="h-4 w-4" />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute left-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
            <button
              onClick={duplicate}
              className="flex w-full items-center gap-2 px-4 py-2 text-right hover:bg-slate-50"
            >
              <Icon name="copy" className="h-4 w-4" /> إنشاء نسخة
            </button>
            <button
              onClick={saveTemplate}
              className="flex w-full items-center gap-2 px-4 py-2 text-right hover:bg-slate-50"
            >
              <Icon name="star" className="h-4 w-4" /> حفظ كقالب
            </button>
            <button
              onClick={remove}
              className="flex w-full items-center gap-2 px-4 py-2 text-right text-red-600 hover:bg-red-50"
            >
              <Icon name="trash" className="h-4 w-4" /> حذف
            </button>
          </div>
        </>
      )}
    </div>
  );
}
