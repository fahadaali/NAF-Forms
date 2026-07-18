import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseSettings, safeParse } from "@/lib/utils";
import type { FormDTO } from "@/lib/types";
import FillForm from "@/components/fill/FillForm";

export const dynamic = "force-dynamic";

export default async function FillPage({
  params,
}: {
  params: { slug: string };
}) {
  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!form) notFound();

  if (form.status === "CLOSED") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
        <div>
          <div className="mb-3 text-5xl">🔒</div>
          <h1 className="text-xl font-bold">هذا النموذج مغلق حاليًا</h1>
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
  const parsed = parseSettings(form.settings);
  const locked = !!parsed.access?.password;
  const fullSettings = { ...parsed, access: {} };

  const dto: FormDTO = {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    type: form.type,
    status: form.status,
    settings: fullSettings,
    questions: form.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type as any,
      label: q.label,
      description: q.description,
      required: q.required,
      config: safeParse<Record<string, any>>(q.config, {}),
    })),
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
