import { notFound } from "next/navigation";
import { authorizeForm } from "@/lib/session";
import { parseSettings, safeParse } from "@/lib/utils";
import type { FormDTO } from "@/lib/types";
import FormBuilder from "@/components/builder/FormBuilder";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const auth = await authorizeForm((await params).formId);
  if (!auth) notFound();
  const form = auth.form;

  const dto: FormDTO = {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    type: form.type,
    status: form.status,
    settings: parseSettings(form.settings),
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

  return <FormBuilder initial={dto} />;
}
