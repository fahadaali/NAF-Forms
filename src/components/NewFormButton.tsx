"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FORM_TYPE_LABELS } from "@/lib/field-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

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
      <Button onClick={() => setOpen(true)}>
        + نموذج جديد
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <Card
            className="w-full max-w-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">إنشاء نموذج</h3>
            <div className="mb-5 flex gap-2 rounded-xl bg-muted p-1 text-sm">
              <button
                className={`flex-1 rounded-lg py-2 font-medium ${
                  tab === "blank" ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setTab("blank")}
              >
                نموذج فارغ
              </button>
              <button
                className={`flex-1 rounded-lg py-2 font-medium ${
                  tab === "template" ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setTab("template")}
              >
                من قالب جاهز
              </button>
            </div>

            {tab === "blank" ? (
              <div>
                <label className="label">عنوان النموذج</label>
                <Input
                  className="mb-4"
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
                          ? "border-primary bg-accent text-primary"
                          : "border-border"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    إلغاء
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={createBlank}
                  >
                    {busy ? "جارٍ…" : "إنشاء وبدء البناء"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    disabled={busy}
                    onClick={() => createFromTemplate(t.id)}
                    className="rounded-xl border border-border p-4 text-start transition hover:border-primary hover:bg-accent disabled:opacity-50"
                  >
                    <span className="chip bg-muted text-muted-foreground">
                      {FORM_TYPE_LABELS[t.type]}
                    </span>
                    <h4 className="mt-2 font-bold">{t.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
