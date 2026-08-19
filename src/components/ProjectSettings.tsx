"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { Input, inputVariants } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

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
    await apiFetch(`/api/projects/${project.id}`, {
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
    await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Button variant="outline"
        className="gap-1.5 text-sm"
        onClick={() => setOpen(true)}
      >
        <Icon name="gear" className="h-4 w-4" /> إعدادات المشروع
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">إعدادات المشروع</h3>
            <label className="label">اسم المشروع</label>
            <Input
              className="mb-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="label">الوصف</label>
            <textarea
              className={cn(inputVariants(), "h-auto py-2 mb-3")}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <label className="label">اللون</label>
            <input
              type="color"
              className="mb-5 h-10 w-20 cursor-pointer rounded-sm"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <Button variant="destructive"
                className="gap-1.5"
                onClick={remove}
              >
                <Icon name="trash" className="h-4 w-4" /> حذف المشروع
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
                <Button disabled={busy} onClick={save}>
                  {busy ? "جارٍ…" : "حفظ"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
