import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FORM_TYPE_LABELS, FORM_STATUS_LABELS } from "@/lib/field-types";
import { formatDateTime } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import NewFormButton from "@/components/NewFormButton";
import FormRowActions from "@/components/FormRowActions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PUBLISHED: "bg-green-100 text-green-700",
  CLOSED: "bg-red-100 text-red-600",
};

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const [project, templates] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        forms: {
          where: { isTemplate: false },
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { responses: true, questions: true } },
          },
        },
      },
    }),
    prisma.form.findMany({
      where: { isTemplate: true },
      select: { id: true, title: true, type: true, description: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  return (
    <div className="min-h-screen">
      <Navbar crumbs={[{ label: project.name }]} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="h-12 w-12 rounded-2xl"
              style={{ background: project.color }}
            />
            <div>
              <h1 className="text-2xl font-extrabold">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-slate-500">{project.description}</p>
              )}
            </div>
          </div>
          <NewFormButton projectId={project.id} templates={templates} />
        </div>

        {project.forms.length === 0 ? (
          <div className="card grid place-items-center p-12 text-center text-slate-500">
            <span className="mb-2 text-4xl">📝</span>
            لا توجد نماذج في هذا المشروع بعد.
          </div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {project.forms.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/forms/${f.id}/edit`}
                      className="truncate font-bold hover:text-naf-700"
                    >
                      {f.title}
                    </Link>
                    <span className={`chip ${STATUS_STYLE[f.status]}`}>
                      {FORM_STATUS_LABELS[f.status]}
                    </span>
                    <span className="chip bg-naf-50 text-naf-700">
                      {FORM_TYPE_LABELS[f.type]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {f._count.questions} سؤال · {f._count.responses} رد · آخر
                    تحديث {formatDateTime(f.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/forms/${f.id}/responses`}
                    className="btn-ghost py-1.5 text-xs"
                  >
                    📊 الردود
                  </Link>
                  <Link
                    href={`/f/${f.slug}`}
                    target="_blank"
                    className="btn-ghost py-1.5 text-xs"
                  >
                    👁️ معاينة
                  </Link>
                  <Link
                    href={`/forms/${f.id}/edit`}
                    className="btn-ghost py-1.5 text-xs"
                  >
                    ✏️ تحرير
                  </Link>
                  <FormRowActions formId={f.id} slug={f.slug} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
