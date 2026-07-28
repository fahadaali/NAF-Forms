import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById, listTemplates } from "@/lib/repo";
import { currentSession, canAccessOwned } from "@/lib/session";
import {
  FORM_TYPE_LABELS,
  FORM_STATUS_LABELS,
  FORM_TYPE_CHIP,
  FORM_STATUS_CHIP,
} from "@/lib/field-types";
import { formatDateTime } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import Navbar from "@/components/Navbar";
import NewFormButton from "@/components/NewFormButton";
import FormRowActions from "@/components/FormRowActions";
import ProjectSettings from "@/components/ProjectSettings";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/naf-format";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [session, project, templates] = await Promise.all([
    currentSession(),
    getProjectById((await params).projectId),
    listTemplates(),
  ]);

  // مشروع غير موجود أو لا يملكه المستخدم → صفحة غير موجودة
  if (!project || !canAccessOwned(session, project.ownerId)) notFound();

  return (
    <div className="min-h-screen">
      <Navbar crumbs={[{ label: project.name }]} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="h-12 w-12 rounded-xl"
              style={{ background: project.color }}
            />
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
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
            {/* «مستخدم (اطّلاع)» يقرأ ولا ينشئ — والوسيط يردّ إنشاءه بـ٤٠٣. */}
            {session?.role !== "viewer" && (
              <NewFormButton projectId={project.id} templates={templates} />
            )}
          </div>
        </div>

        {project.forms.length === 0 ? (
          <Card className="grid place-items-center p-12 text-center text-muted-foreground">
            <Icon name="edit" className="mb-2 h-10 w-10 text-muted-foreground" />
            لا توجد نماذج في هذا المشروع بعد.
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {project.forms.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/forms/${f.id}/edit`}
                      className="truncate font-bold hover:text-primary"
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    <bdi>{formatNumber(f._count.questions)}</bdi> سؤال ·{" "}
                    <bdi>{formatNumber(f._count.responses)}</bdi> رد · آخر تحديث{" "}
                    <bdi>{formatDateTime(f.updatedAt)}</bdi>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/forms/${f.id}/responses`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Icon name="chart" className="h-4 w-4" /> الردود
                  </Link>
                  <Link
                    href={`/f/${f.slug}`}
                    target="_blank"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Icon name="eye" className="h-4 w-4" /> معاينة
                  </Link>
                  <Link
                    href={`/forms/${f.id}/edit`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Icon name="edit" className="h-4 w-4" /> تعديل
                  </Link>
                  <FormRowActions formId={f.id} slug={f.slug} />
                </div>
              </div>
            ))}
          </Card>
        )}
      </main>
    </div>
  );
}
