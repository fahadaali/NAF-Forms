"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, inputVariants } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@/components/ui/Icon";
import { apiFetch } from "@/lib/api-client";

/* شاشة التهيئة المسبقة.

   لا تُنشئ حسابًا ولا تُدخل به: المصادقة في المركز. وظيفة الصفّ هنا أن
   يجده الدخول الموحّد عند **أول دخول** لصاحب البريد نفسه فيربطه بهويته
   المركزية ويعطيه الصلاحية المكتوبة هنا بدل الافتراضية.

   وكانت الشاشة تقول غير ذلك: «كلمة المرور الافتراضية 1234» و«إعادة تعيين
   لـ 1234» و«لم يغيّر كلمة المرور» — ثلاث وعود لا يقع منها شيء منذ
   الدخول الموحّد. */
interface U {
  id: string;
  email: string;
  role: string;
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
    const res = await apiFetch("/api/users", {
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
    await apiFetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا التسجيل؟")) return;
    const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    // الحذف يُردّ حين تتعلّق به ملكية — والسبب يُقال ولا يُبتلع
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "تعذّر الحذف");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* إضافة مستخدم */}
      <Card className="p-5">
        <h3 className="mb-3 font-bold">تسجيل بريد</h3>
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
            <label className="label" htmlFor="new-role">
              الصلاحية
            </label>
            <select
              id="new-role"
              className={inputVariants()}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">محرّر</option>
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
          لا يُنشأ حساب هنا ولا كلمة مرور. يُسجَّل البريد وصلاحيته، فإذا دخل
          صاحبه بالدخول الموحّد أول مرة رُبط به وأخذ هذه الصلاحية بدل
          الصلاحية الافتراضية.
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
                <span className="chip chip-draft">بانتظار أول دخول</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* المسمّيات كما تُترجَم فعلًا عند الربط: `mapLegacyRole` في
                  lib/sso.ts تجعل `member` ⇦ «محرّر»، فقولُ «عضو» هنا اسمٌ
                  ثالث لا مقابل له في شاشة الصلاحيات. */}
              <label className="sr-only" htmlFor={`role-${u.id}`}>
                الصلاحية
              </label>
              <select
                id={`role-${u.id}`}
                className={inputVariants({ size: "sm" })}
                value={u.role}
                onChange={(e) => patch(u.id, { role: e.target.value })}
                disabled={u.id === meId}
              >
                <option value="member">محرّر</option>
                <option value="admin">مسؤول</option>
              </select>
              {u.id !== meId && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive-soft"
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
