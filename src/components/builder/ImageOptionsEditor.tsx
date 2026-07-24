"use client";
import { Icon } from "@/components/ui/Icon";

interface ImgOption {
  label: string;
  url: string;
}

export default function ImageOptionsEditor({
  options,
  onChange,
}: {
  options: ImgOption[];
  onChange: (opts: ImgOption[]) => void;
}) {
  const set = (i: number, patch: Partial<ImgOption>) => {
    const next = [...options];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () =>
    onChange([...options, { label: `خيار ${options.length + 1}`, url: "" }]);
  const remove = (i: number) => onChange(options.filter((_, x) => x !== i));

  async function upload(i: number, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    set(i, { url: data.url });
  }

  return (
    <div>
      <label className="label">خيارات مصوّرة</label>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 grid h-24 place-items-center overflow-hidden rounded-lg bg-slate-100">
              {o.url ? (
                <img src={o.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="image" className="h-7 w-7 text-slate-400" />
              )}
            </div>
            <input
              className="input mb-2 py-1.5"
              placeholder="التسمية"
              value={o.label}
              onChange={(e) => set(i, { label: e.target.value })}
            />
            <div className="flex items-center justify-between">
              <label className="cursor-pointer text-xs font-medium text-naf-600 hover:underline">
                رفع صورة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(i, e.target.files[0])}
                />
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-red-500 hover:underline"
                disabled={options.length <= 1}
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-sm font-medium text-naf-600 hover:underline"
      >
        + إضافة خيار مصوّر
      </button>
    </div>
  );
}
