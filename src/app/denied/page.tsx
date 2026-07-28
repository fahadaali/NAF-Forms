import Link from "next/link";
import { CircleSlash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// صفحة الرفض. تعرض سبباً مسجَّلاً واحداً، ولا تكشف تفصيلاً تقنياً ولا
// مستخدمين آخرين.
//
// النصوص كلها مسجَّلة في naf-terms.md ولم يُصَغ منها شيء هنا:
// - «معطّل» حالةٌ مسجَّلة مع أيقونتها CircleSlash ولونها muted-foreground
// - «لا تملك صلاحية الوصول لهذه الصفحة» مسجَّلة في أخطاء §٤
// - «انتهت جلسة دخولك. سجّل الدخول من جديد» مسجَّلة في §١٠
// - «تسجيل الدخول» مسجَّلة في §٢

// رموز الرفض وحدها، ولا نصّ حرّ من الرابط.
//
// الرابط يصل من الخارج ويكتبه من شاء: عرضُ ما فيه كما كُتب يجعل أيَّ أحد
// قادراً على إظهار ما يريد على نطاق المنصة — وهو بعينه ما تجنّبه المركز حين
// جعل `‎/denied` يحمل معرّفاً لا جملة. فما لا يُعرف رمزُه يُعرض بالرسالة
// العامة، ولا يُقرأ منه حرف.
const REASONS: Record<string, string> = {
  not_member: "لا تملك صلاحية الوصول لهذه الصفحة",
  inactive: "معطّل",
  auth_failed: "انتهت جلسة دخولك. سجّل الدخول من جديد",
};

const FALLBACK = REASONS.not_member;

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const raw = (await searchParams).r ?? "";
  const isInactive = raw === "inactive";
  const message = REASONS[raw] ?? FALLBACK;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <main className="w-full max-w-md">
        {isInactive ? (
          // الحالة المسجّلة: أيقونة ولون ونصّ معاً — لا لون وحده.
          <Alert>
            <CircleSlash className="text-muted-foreground" />
            <AlertDescription className="text-muted-foreground">معطّل</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">تسجيل الدخول</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
