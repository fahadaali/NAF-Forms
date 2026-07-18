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
    <div className="grid min-h-screen place-items-center bg-gradient-to-l from-naf-700 to-naf-500 px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-naf-600 text-2xl font-extrabold text-white">
          ن
        </span>
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
