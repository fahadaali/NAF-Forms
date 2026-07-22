"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (pw.length < 4) return setError("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
    if (pw !== confirm) return setError("كلمتا المرور غير متطابقتين");
    setBusy(true);
    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: pw }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "تعذّر الحفظ");
    }
  }

  return (
    <div
      className="relative grid min-h-screen place-items-center px-4"
      style={{ background: "linear-gradient(135deg, #2a3149, #1c2338)" }}
    >
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
      <div className="glass relative w-full max-w-sm rounded-2xl p-8 text-center">
        <img
          src="/naf-logo.jpg"
          alt="ناف"
          className="mx-auto mb-5 h-16 w-16 rounded-2xl object-cover shadow-glow ring-1 ring-brand-taupe/40"
        />
        <h1 className="text-xl font-extrabold">تعيين كلمة مرور جديدة</h1>
        <p className="mt-1 text-sm text-slate-500">
          هذا أول دخول لك — اختر كلمة مرور خاصة بك للمرات القادمة.
        </p>
        <input
          type="password"
          className="input mt-5 text-center"
          placeholder="كلمة المرور الجديدة"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          className="input mt-3 text-center"
          placeholder="تأكيد كلمة المرور"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !pw || !confirm}
          className="btn-primary mt-4 w-full disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ…" : "حفظ ومتابعة"}
        </button>
      </div>
    </div>
  );
}
