"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NafLogo } from "@/components/ui/naf-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    // صفحة داكنة مقصودة: نُطاق `dark` يجعلها تستهلك رموز الوضع الداكن
    // بدل تدرّج بقيم حرفية (القاعدة ١).
    <div className="dark relative grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
      <div className="glass relative w-full max-w-sm rounded-xl p-8 text-center">
        <NafLogo className="mx-auto mb-5 h-16 w-16" />
        <h1 className="text-xl font-bold">تعيين كلمة مرور جديدة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هذا أول دخول لك — اختر كلمة مرور خاصة بك للمرات القادمة.
        </p>
        <Input
          type="password"
          className="mt-5 text-center"
          placeholder="كلمة المرور الجديدة"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        <Input
          type="password"
          className="mt-3 text-center"
          placeholder="تأكيد كلمة المرور"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button
          onClick={submit}
          disabled={busy || !pw || !confirm}
          className="mt-4 w-full disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ…" : "حفظ ومتابعة"}
        </Button>
      </div>
    </div>
  );
}
