import Link from "next/link";
import { CircleAlert, CircleSlash, ShieldX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// صفحة الرفض.
//
// **لا تسأل عن العضو عند الإقلاع.** هي صفحة عامة تُحمَّل بلا جلسة، ولو
// سألت عن الهوية لردّ عليها الوسيط ٤٠١ فحوّل إلى المركز، فسقط الاستقبال،
// فعاد إلى الرفض — دورة لا تُقرأ فيها الرسالة أصلاً. وهذه صفحة خادم بلا
// أي نداء عند الإقلاع، وعميل اللوحة يستثني هذا المسار كذلك.
//
// وتعرض السبب وحده: لا رمز خطأ تقنياً، ولا اسم مستخدم آخر، ولا تلميح إلى
// أنّ للمنصة أعضاء غيره.
//
// والحزمة تمرّر **رمز سبب** لا جملة، وهذه الصفحة تترجمه إلى المصطلح
// المسجَّل في `naf-terms.md` — أربعة رموز لا خامس لها. ولو حملت الحزمة
// الجملة لصارت مصدر نصّ ثانياً خارج السجلّ.
//
// وكان `bad_state` و`auth_failed` يشتركان في نصّ واحد قبل `v1.18.0` لأن
// الثاني لم يكن مسجَّلاً؛ وقد سُجّل، والحالتان مختلفتان: الأولى جلسة
// انتهت، والثانية عطل في المحاولة نفسها.

const REASONS = {
  inactive: {
    text: "عضويتك في هذه المنصة معطّلة. راجع مسؤول المنصة.",
    Icon: CircleSlash,
    tone: "text-muted-foreground",
  },
  not_member: {
    text: "لا تملك صلاحية الوصول لهذه المنصة",
    Icon: ShieldX,
    tone: "text-destructive-strong",
  },
  bad_state: {
    text: "انتهت جلسة دخولك. سجّل الدخول من جديد",
    Icon: CircleAlert,
    tone: "text-destructive-strong",
  },
  auth_failed: {
    text: "تعذّر التحقق من دخولك. أعد المحاولة.",
    Icon: CircleAlert,
    tone: "text-destructive-strong",
  },
} as const;

// حدٌّ للطول: السبب الحرّ يصل من المركز عبر الرابط، ونصّ طويل يفسد الصفحة.
const MAX_REASON = 300;

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const raw = (await searchParams).r ?? "";
  const known = REASONS[raw as keyof typeof REASONS];

  // ما جاء من المركز نصّاً حرّاً يُعرض كما كُتب — لا يُعاد صوغه ولا يُختصر
  // ولا يُستبدل بنصّ عام. وحين لا يصل شيء يظهر نصّ «بلا صلاحية».
  const fallback = REASONS.not_member;
  const Icon = known?.Icon ?? fallback.Icon;
  const tone = known?.tone ?? fallback.tone;
  const text = known?.text ?? (raw ? raw.slice(0, MAX_REASON) : fallback.text);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <main className="w-full max-w-md">
        {/* الحالة بأيقونة ولون ونصّ معاً — لا لون وحده. */}
        <Alert>
          <Icon className={tone} />
          <AlertTitle>تعذّر الدخول</AlertTitle>
          <AlertDescription>{text}</AlertDescription>
        </Alert>

        {/* الجذر لا `/login`: باب كلمة المرور أُغلق، والوسيط يحوّل من هنا
            إلى باب المركز — وهي تحويلة تنقّلٍ كامل يتبعها المتصفّح. */}
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">تسجيل الدخول</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
