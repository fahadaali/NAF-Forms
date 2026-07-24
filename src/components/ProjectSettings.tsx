"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export default function ProjectSettings({
  project,
}: {
  project: { id: string; name: string; description: string; color: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description);
  const [color, setColor] = useState(project.color);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc, color }),
    });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        "حذف هذا المشروع وجميع نماذجه وردوده نهائيًا؟ لا يمكن التراجع."
      )
    )
      return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button
        className="btn-ghost inline-flex items-center gap-1.5 text-sm"
        onClick={() => setOpen(true)}
      >
        <Icon name="gear" className="h-4 w-4" /> إعدادات المشروع
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
            <h3 className="mb-4 text-lg font-bold">إعدادات المشروع</h3>
            <label className="label">اسم المشروع</label>
            <input
              className="input mb-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="label">الوصف</label>
            <textarea
              className="input mb-3"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <label className="label">اللون</label>
            <input
              type="color"
              className="mb-5 h-10 w-20 cursor-pointer rounded"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <button
                className="btn-danger inline-flex items-center gap-1.5"
                onClick={remove}
              >
                <Icon name="trash" className="h-4 w-4" /> حذف المشروع
              </button>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setOpen(false)}>
                  إلغاء
                </button>
                <button className="btn-primary" disabled={busy} onClick={save}>
                  {busy ? "جارٍ…" : "حفظ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
