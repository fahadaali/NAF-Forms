"use client";
import { FIELD_TYPES, FIELD_GROUPS } from "@/lib/field-types";
import type { FieldTypeId } from "@/lib/field-types";

export default function AddQuestionPalette({
  onAdd,
}: {
  onAdd: (type: FieldTypeId) => void;
}) {
  return (
    <div className="card sticky top-20 p-4">
      <h3 className="mb-3 font-bold">إضافة سؤال</h3>
      <div className="space-y-4">
        {FIELD_GROUPS.map((g) => (
          <div key={g.id}>
            <p className="mb-1.5 text-xs font-semibold text-slate-400">
              {g.label}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_TYPES.filter((f) => f.group === g.id).map((f) => (
                <button
                  key={f.id}
                  onClick={() => onAdd(f.id)}
                  title={f.hint}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs font-medium hover:border-naf-400 hover:bg-naf-50"
                >
                  <span className="text-base">{f.icon}</span>
                  <span className="truncate">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
