/* شاشة لا تُبلَغ — والباب الذي تطرقه مغلق.
   المصادقة كلها في المركز، والدخول من `{AUTH_ISSUER}/go/NAF-Forms` وحده.
   وهذا المسار خلف حارس الدخول الموحّد (خارج `PUBLIC_EXACT` في lib/sso.ts)
   فلا يصله أحد، ولو وصله لعرض نموذجًا يُرسل إلى `/api/login` الذي يردّ ٤١٠.
   أُبقي ولا يُستأنف استعماله (القاعدة ١١: لا يُحذف ملف). */

"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NafLogo } from "@/components/ui/naf-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/Icon";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(data.mustChange ? "/change-password" : next);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "تعذّر تسجيل الدخول");
    }
  }

  return (
    // صفحة داكنة مقصودة: نُطاق `dark` يجعلها تستهلك رموز الوضع الداكن
    // بدل تدرّج بقيم حرفية (القاعدة ١).
    <div className="dark relative grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
      <div className="glass relative w-full max-w-sm rounded-xl p-8 text-center">
        <NafLogo className="mx-auto mb-5 h-20 w-20" />
        <h1 className="text-xl font-bold">لوحة تحكم ناف</h1>
        <p className="mt-1 text-sm text-muted-foreground">سجّل الدخول بالبريد وكلمة المرور</p>
        <Input
          type="email"
          dir="ltr"
          className="mt-5 text-center"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        <Input
          type="password"
          className="mt-3 text-center"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-destructive">
            <Icon name="alert" className="h-4 w-4" /> {error}
          </p>
        )}
        <Button
          onClick={submit}
          disabled={busy || !email || !password}
          className="mt-4 w-full disabled:opacity-50"
        >
          {busy ? "جارٍ الدخول…" : "تسجيل الدخول"}
        </Button>
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
