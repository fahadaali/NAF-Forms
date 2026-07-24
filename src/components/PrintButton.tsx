"use client";
import { Icon } from "@/components/ui/Icon";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary mb-6 inline-flex items-center gap-1.5 print:hidden"
    >
      <Icon name="printer" className="h-4 w-4" /> طباعة / حفظ PDF
    </button>
  );
}
