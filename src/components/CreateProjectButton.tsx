"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#1c59f5");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc, color }),
    });
    const p = await res.json();
    setBusy(false);
    setOpen(false);
    router.push(`/projects/${p.id}`);
    router.refresh();
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + مشروع جديد
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">إنشاء مشروع</h3>
            <label className="label">اسم المشروع</label>
            <input
              className="input mb-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: التوظيف 2026"
              autoFocus
            />
            <label className="label">وصف مختصر</label>
            <textarea
              className="input mb-3"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <label className="label">لون المشروع</label>
            <input
              type="color"
              className="mb-5 h-10 w-20 cursor-pointer rounded"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                إلغاء
              </button>
              <button className="btn-primary" disabled={busy} onClick={create}>
                {busy ? "جارٍ…" : "إنشاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
