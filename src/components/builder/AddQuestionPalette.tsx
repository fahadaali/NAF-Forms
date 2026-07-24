"use client";
import { useState } from "react";
import { FIELD_TYPES, FIELD_GROUPS } from "@/lib/field-types";
import type { FieldTypeId } from "@/lib/field-types";

export default function AddQuestionPalette({
  onAdd,
}: {
  onAdd: (type: FieldTypeId) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const match = (label: string, hint: string) =>
    !q || label.includes(q) || hint.includes(q);

  return (
    <aside className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 font-bold">العناصر</h3>
      <p className="mb-3 text-xs text-slate-400">اضغط عنصرًا لإضافته إلى النموذج.</p>
      <input
        className="input mb-3 py-1.5 text-sm"
        placeholder="🔍 ابحث عن عنصر…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="space-y-4">
        {FIELD_GROUPS.map((g) => {
          const items = FIELD_TYPES.filter(
            (f) => f.group === g.id && match(f.label, f.hint)
          );
          if (!items.length) return null;
          return (
            <div key={g.id}>
              <p className="mb-1.5 text-xs font-semibold text-slate-400">
                {g.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onAdd(f.id)}
                    title={f.hint}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs font-medium transition hover:border-naf-400 hover:bg-naf-50"
                  >
                    <span className="text-base">{f.icon}</span>
                    <span className="truncate">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
