import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById, listTemplates } from "@/lib/repo";
import {
  FORM_TYPE_LABELS,
  FORM_STATUS_LABELS,
  FORM_TYPE_CHIP,
  FORM_STATUS_CHIP,
} from "@/lib/field-types";
import { formatDateTime } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import NewFormButton from "@/components/NewFormButton";
import FormRowActions from "@/components/FormRowActions";
import ProjectSettings from "@/components/ProjectSettings";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [project, templates] = await Promise.all([
    getProjectById((await params).projectId),
    listTemplates(),
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
          <div className="flex items-center gap-2">
            <ProjectSettings
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                color: project.color,
              }}
            />
            <NewFormButton projectId={project.id} templates={templates} />
          </div>
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
                    <span className={`chip ${FORM_STATUS_CHIP[f.status]}`}>
                      {FORM_STATUS_LABELS[f.status]}
                    </span>
                    <span className={`chip ${FORM_TYPE_CHIP[f.type]}`}>
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
