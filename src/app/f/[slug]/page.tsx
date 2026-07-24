import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/repo";
import { parseSettings, safeParse } from "@/lib/utils";
import type { FormDTO } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import FillForm from "@/components/fill/FillForm";

export const dynamic = "force-dynamic";

export default async function FillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const form = await getPublicForm((await params).slug);
  if (!form) notFound();

  // حساب حالة الإغلاق (يدوي، أو بانتهاء الوقت، أو باكتمال العدد)
  const s = parseSettings(form.settings);
  const closeAt = s.limits?.closeAt;
  const maxResponses = s.limits?.maxResponses;
  const timeUp = !!closeAt && new Date(closeAt).getTime() < Date.now();
  const full = !!maxResponses && maxResponses > 0 && form._count.responses >= maxResponses;

  if (form.status === "CLOSED" || timeUp || full) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
        <div>
          <div className="mb-3 flex justify-center text-slate-300">
            <Icon name="lock" className="h-14 w-14" />
          </div>
          <h1 className="text-xl font-bold">
            {full ? "اكتمل العدد الأقصى للردود" : timeUp ? "انتهى وقت استقبال الردود" : "هذا النموذج مغلق حاليًا"}
          </h1>
          <p className="mt-2 text-slate-500">لم يعد بالإمكان استقبال ردود جديدة.</p>
        </div>
      </div>
    );
  }

  if (form.status === "DRAFT") {
    // مسموح بالمعاينة، مع تنبيه
    // (النشر يتم من صفحة البناء)
  }

  // إزالة كلمة المرور قبل الإرسال للعميل، مع تمرير مؤشر وجودها فقط
  const locked = !!s.access?.password;
  const fullSettings = { ...s, access: {} };

  const dto: FormDTO = {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    type: form.type,
    status: form.status,
    settings: fullSettings,
    questions: form.questions.map((q) => {
      const cfg = safeParse<Record<string, any>>(q.config, {});
      // عدم كشف الإجابات الصحيحة والدرجات للمستفيد (للاختبارات)
      const { correctAnswer, points, ...safeCfg } = cfg;
      return {
        id: q.id,
        order: q.order,
        type: q.type as any,
        label: q.label,
        description: q.description,
        required: q.required,
        config: safeCfg,
      };
    }),
  };

  return (
    <>
      {form.status === "DRAFT" && (
        <div className="bg-amber-400 py-1.5 text-center text-sm font-medium text-amber-950">
          وضع المعاينة — هذا النموذج لم يُنشر بعد
        </div>
      )}
      <FillForm form={dto} locked={locked} />
    </>
  );
}
