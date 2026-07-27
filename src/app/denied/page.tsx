import Link from "next/link";
import { CircleSlash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// صفحة الرفض. تعرض السبب النصّي القادم فقط، ولا تكشف تفصيلاً تقنياً ولا
// مستخدمين آخرين (الاحتراز السابع في §٦ من وثيقة الربط).
//
// النصوص كلها مسجَّلة في naf-terms.md ولم يُصَغ منها شيء هنا:
// - «معطّل» حالةٌ مسجَّلة مع أيقونتها CircleSlash ولونها muted-foreground
// - «لا تملك صلاحية الوصول لهذه الصفحة» مسجَّلة في أخطاء §٤
// - «انتهت جلسة دخولك. سجّل الدخول من جديد» مسجَّلة في §١٠
// - «تسجيل الدخول» مسجَّلة في §٢

// رموز الرفض التي ترسلها naf-auth. وما عداها نصٌّ حرّ من المركز يُعرض كما
// كُتب — وهي القاعدة المسجّلة: لا يُعاد صوغه ولا يُختصر ولا يُستبدل بنصّ عام.
const REASONS: Record<string, string> = {
  not_member: "لا تملك صلاحية الوصول لهذه الصفحة",
  bad_state: "انتهت جلسة دخولك. سجّل الدخول من جديد",
  auth_failed: "انتهت جلسة دخولك. سجّل الدخول من جديد",
};

// حدٌّ للطول: الرابط يصل من الخارج، ونصّ طويل يفسد الصفحة بلا فائدة.
const MAX_REASON = 300;

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const raw = (await searchParams).r ?? "";
  const isInactive = raw === "inactive";
  const message = REASONS[raw] ?? (raw ? raw.slice(0, MAX_REASON) : REASONS.not_member);

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
