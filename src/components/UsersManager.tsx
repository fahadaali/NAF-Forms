"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, inputVariants } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@/components/ui/Icon";

interface U {
  id: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

export default function UsersManager({
  initial,
  meId,
}: {
  initial: U[];
  meId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setBusy(false);
    if (res.ok) {
      setEmail("");
      setRole("member");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "تعذّرت الإضافة");
    }
  }

  async function patch(id: string, body: any) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا المستخدم؟")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* إضافة مستخدم */}
      <Card className="p-5">
        <h3 className="mb-3 font-bold">إضافة مستخدم</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="label">البريد الإلكتروني</label>
            <Input
              dir="ltr"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">الدور</label>
            <select className={inputVariants()} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">عضو</option>
              <option value="admin">مسؤول</option>
            </select>
          </div>
          <Button disabled={busy || !email} onClick={add}>
            + إضافة
          </Button>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <Icon name="alert" className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          يُنشأ الحساب بكلمة المرور الافتراضية <b>1234</b>، ويُطلب من المستخدم
          تغييرها عند أول دخول.
        </p>
      </Card>

      {/* قائمة المستخدمين */}
      <Card className="divide-y divide-border">
        {initial.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold" dir="ltr">
                  {u.email}
                </span>
                {u.id === meId && (
                  <span className="chip bg-accent text-primary">أنت</span>
                )}
                {u.mustChangePassword && (
                  <span className="chip chip-draft">لم يغيّر كلمة المرور</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className={inputVariants({ size: "sm" })}
                value={u.role}
                onChange={(e) => patch(u.id, { role: e.target.value })}
                disabled={u.id === meId}
              >
                <option value="member">عضو</option>
                <option value="admin">مسؤول</option>
              </select>
              <Button variant="outline" size="sm"
                onClick={() => patch(u.id, { action: "reset" })}
              >
                إعادة تعيين لـ 1234
              </Button>
              {u.id !== meId && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                  onClick={() => remove(u.id)}
                >
                  <Icon name="trash" className="h-4 w-4" /> حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
