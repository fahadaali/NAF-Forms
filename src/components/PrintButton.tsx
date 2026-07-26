"use client";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";

export default function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="mb-6 print:hidden">
      <Icon name="printer" className="h-4 w-4" /> طباعة / حفظ PDF
    </Button>
  );
}
