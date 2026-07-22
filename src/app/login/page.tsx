"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setError("كلمة المرور غير صحيحة");
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
          className="mx-auto mb-5 h-20 w-20 rounded-2xl object-cover shadow-glow ring-1 ring-brand-taupe/40"
        />
        <h1 className="text-xl font-extrabold">لوحة تحكم ناف</h1>
        <p className="mt-1 text-sm text-slate-500">أدخل كلمة مرور المشرف للدخول</p>
        <input
          type="password"
          className="input mt-5 text-center"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !password}
          className="btn-primary mt-4 w-full disabled:opacity-50"
        >
          {busy ? "جارٍ الدخول…" : "دخول"}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
