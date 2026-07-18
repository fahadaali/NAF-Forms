"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary mb-6 print:hidden"
    >
      🖨️ طباعة / حفظ PDF
    </button>
  );
}
