"use client";
import { Icon } from "@/components/ui/Icon";

export default function OptionsEditor({
  options,
  onChange,
  label = "الخيارات",
}: {
  options: string[];
  onChange: (opts: string[]) => void;
  label?: string;
}) {
  const set = (i: number, v: string) => {
    const next = [...options];
    next[i] = v;
    onChange(next);
  };
  const add = () => onChange([...options, `الخيار ${options.length + 1}`]);
  const remove = (i: number) => onChange(options.filter((_, x) => x !== i));

  return (
    <div>
      <label className="label">{label}</label>
      <div className="space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-slate-400">•</span>
            <input
              className="input py-1.5"
              value={o}
              onChange={(e) => set(i, e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded-lg px-2 py-1 text-red-500 hover:bg-red-50"
              disabled={options.length <= 1}
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-sm font-medium text-naf-600 hover:underline"
      >
        + إضافة خيار
      </button>
    </div>
  );
}
