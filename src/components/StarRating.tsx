"use client";
import { useState } from "react";

export default function StarRating({
  value,
  max = 5,
  onChange,
  readOnly = false,
  size = 40,
}: {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange?.(n === value ? 0 : n)}
            className={`transition-transform ${readOnly ? "" : "hover:scale-110"}`}
            style={{ fontSize: size, lineHeight: 1 }}
            aria-label={`${n} من ${max}`}
          >
            <span className={n <= active ? "text-amber-400" : "text-slate-300"}>
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
}
