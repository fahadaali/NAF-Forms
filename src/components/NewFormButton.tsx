"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FORM_TYPE_LABELS } from "@/lib/field-types";

interface Template {
  id: string;
  title: string;
  type: string;
  description: string;
}

export default function NewFormButton({
  projectId,
  templates,
}: {
  projectId: string;
  templates: Template[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"blank" | "template">("blank");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("SURVEY");
  const [busy, setBusy] = useState(false);

  async function createBlank() {
    setBusy(true);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title, type }),
    });
    const f = await res.json();
    router.push(`/forms/${f.id}/edit`);
  }

  async function createFromTemplate(templateId: string) {
    setBusy(true);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, templateId }),
    });
    const f = await res.json();
    router.push(`/forms/${f.id}/edit`);
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + نموذج جديد
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="card w-full max-w-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">إنشاء نموذج</h3>
            <div className="mb-5 flex gap-2 rounded-xl bg-slate-100 p-1 text-sm">
              <button
                className={`flex-1 rounded-lg py-2 font-medium ${
                  tab === "blank" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
                onClick={() => setTab("blank")}
              >
                نموذج فارغ
              </button>
              <button
                className={`flex-1 rounded-lg py-2 font-medium ${
                  tab === "template" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
                onClick={() => setTab("template")}
              >
                من قالب جاهز
              </button>
            </div>

            {tab === "blank" ? (
              <div>
                <label className="label">عنوان النموذج</label>
                <input
                  className="input mb-4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: استبيان رضا الموظفين"
                  autoFocus
                />
                <label className="label">نوع النموذج</label>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setType(k)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                        type === k
                          ? "border-naf-500 bg-naf-50 text-naf-700"
                          : "border-slate-200"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => setOpen(false)}>
                    إلغاء
                  </button>
                  <button
                    className="btn-primary"
                    disabled={busy}
                    onClick={createBlank}
                  >
                    {busy ? "جارٍ…" : "إنشاء وبدء البناء"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    disabled={busy}
                    onClick={() => createFromTemplate(t.id)}
                    className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-naf-400 hover:bg-naf-50 disabled:opacity-50"
                  >
                    <span className="chip bg-slate-100 text-slate-600">
                      {FORM_TYPE_LABELS[t.type]}
                    </span>
                    <h4 className="mt-2 font-bold">{t.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {t.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
