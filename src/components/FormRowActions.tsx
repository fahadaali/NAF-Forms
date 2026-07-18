"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormRowActions({
  formId,
  slug,
}: {
  formId: string;
  slug: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function remove() {
    if (!confirm("حذف هذا النموذج وجميع ردوده؟")) return;
    await fetch(`/api/forms/${formId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={copyLink}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        title="نسخ رابط التقديم"
      >
        {copied ? "✓ تم النسخ" : "🔗 رابط"}
      </button>
      <button
        onClick={remove}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
      >
        حذف
      </button>
    </div>
  );
}
