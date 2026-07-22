"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="card p-5">
        <h3 className="mb-3 font-bold">إضافة مستخدم</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="label">البريد الإلكتروني</label>
            <input
              className="input"
              dir="ltr"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">الدور</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">عضو</option>
              <option value="admin">مسؤول</option>
            </select>
          </div>
          <button className="btn-primary" disabled={busy || !email} onClick={add}>
            + إضافة
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <p className="mt-2 text-xs text-slate-400">
          يُنشأ الحساب بكلمة المرور الافتراضية <b>1234</b>، ويُطلب من المستخدم
          تغييرها عند أول دخول.
        </p>
      </div>

      {/* قائمة المستخدمين */}
      <div className="card divide-y divide-slate-100">
        {initial.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold" dir="ltr">
                  {u.email}
                </span>
                {u.id === meId && (
                  <span className="chip bg-naf-50 text-naf-700">أنت</span>
                )}
                {u.mustChangePassword && (
                  <span className="chip chip-draft">لم يغيّر كلمة المرور</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input py-1.5 text-sm"
                value={u.role}
                onChange={(e) => patch(u.id, { role: e.target.value })}
                disabled={u.id === meId}
              >
                <option value="member">عضو</option>
                <option value="admin">مسؤول</option>
              </select>
              <button
                className="btn-ghost py-1.5 text-xs"
                onClick={() => patch(u.id, { action: "reset" })}
              >
                إعادة تعيين لـ 1234
              </button>
              {u.id !== meId && (
                <button
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                  onClick={() => remove(u.id)}
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
