"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputVariants } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "@/lib/naf-format";
import { ROLE_LABEL, ROLES, type MemberRow } from "@/lib/roles";
import { apiFetch } from "@/lib/api-client";

// شاشة الصلاحيات. الأعضاء يأتون من الدخول الموحّد ولا يُضافون هنا — فلا
// زرّ إضافة: المنح والسحب قرارُ المركز، وهذه الشاشة توزّع الصلاحية بعده.
export default function MembersManager({
  initial,
  meId,
}: {
  initial: MemberRow[];
  meId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  async function patch(userId: string, body: Record<string, unknown>) {
    setError("");
    setNotice("");
    setBusy(userId);
    const res = await apiFetch(`/api/members/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy("");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "حدث خطأ في النظام. أعد المحاولة بعد قليل");
      return;
    }

    /* السحب نافذ محلياً فور كتابته، والناقص إظهارُ سببه في شبكة المركز.
       فيُفصل ما تمّ عمّا لم يتمّ، ولا يُقال «فشل» لفعلٍ نُفِّذ.

       والمنح ليس له نصّ تعذّر مسجَّل في السجلّ — فيأخذ «فشل الاتصال»
       المسجَّل ولا يُصاغ له نصّ محلي. مرفوعٌ في تقرير هذه الجلسة. */
    if (data.reported === false) {
      setNotice(
        body.isActive === false
          ? "سُحب الوصول في هذه المنصة، ولم يبلغ السحبُ المركزَ. أعد المحاولة"
          : "تعذّر الاتصال. تحقق من الشبكة وأعد المحاولة"
      );
    } else {
      setNotice(data.message);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert variant="success">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {/* الشاشة الفارغة تقول متى يظهر العضو ولا تدعو إلى إضافته: لا
          يُضاف الأعضاء من المنصة — يصلون من المركز. */}
      {initial.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          لا أعضاء بعد. يظهر العضو هنا بعد أول دخول له.
        </Card>
      ) : (
      <Card className="divide-y divide-border">
        {initial.map((m) => (
          <div
            key={m.userId}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {m.displayName && <span className="font-semibold">{m.displayName}</span>}
                <bdi className="text-sm text-muted-foreground">{m.email}</bdi>
                {m.userId === meId && (
                  <span className="chip bg-accent text-primary">أنت</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                {/* الحالة: أيقونة ولون ونصّ معاً — لا لون وحده. */}
                {m.isActive ? (
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <CircleCheck className="size-4" aria-hidden />
                    نشط
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <CircleSlash className="size-4" aria-hidden />
                    معطّل
                  </span>
                )}
                {m.lastSeenAt !== null && (
                  <span className="text-muted-foreground">
                    آخر نشاط <bdi>{formatDate(m.lastSeenAt * 1000)}</bdi>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`role-${m.userId}`}>
                الصلاحية
              </label>
              <select
                id={`role-${m.userId}`}
                className={inputVariants({ size: "sm" })}
                value={m.role}
                disabled={busy === m.userId}
                onChange={(e) => patch(m.userId, { role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>

              {/* «سحب» و«منح» زوجٌ مسجَّل. و«تعطيل» ممنوعة هنا صراحةً:
                  توهم بحالة ثالثة بين النشط والمعطّل. */}
              <Button
                variant="outline"
                size="sm"
                disabled={busy === m.userId}
                onClick={() => patch(m.userId, { isActive: !m.isActive })}
              >
                {m.isActive ? "سحب" : "منح"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
      )}
    </div>
  );
}
