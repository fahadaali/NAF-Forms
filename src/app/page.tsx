import Link from "next/link";
import {
  listProjects,
  listTemplates,
  countForms,
  countResponsesByOwner,
} from "@/lib/repo";
import { currentSession, ownerFilter } from "@/lib/session";
import { FORM_TYPE_LABELS, FORM_TYPE_CHIP } from "@/lib/field-types";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import CreateProjectButton from "@/components/CreateProjectButton";
import { NafLogo } from "@/components/ui/naf-logo";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // المسؤول يرى كل المشاريع، والعضو يرى مشاريعه فقط
  const session = await currentSession();
  const owner = ownerFilter(session);
  const [projects, templates, formCount, responseCount] = await Promise.all([
    listProjects(owner),
    listTemplates(),
    countForms(false, owner),
    countResponsesByOwner(owner),
  ]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* بطاقة ترحيبية */}
        {/* لوحة داكنة مقصودة: نُطاق `dark` يجعلها تستهلك رموز الثيم الداكنة
            بدل تدرّج مكتوب بقيم حرفية (القاعدة ١: لا قيمة تصميم حرفية). */}
        <section className="dark relative mb-8 overflow-hidden rounded-xl border border-border bg-card p-8 text-card-foreground md:p-10">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.15]" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold text-card-foreground md:text-4xl">
                نظام استبانات <span className="text-primary">ناف</span>
              </h1>
              <p className="mt-3 text-muted-foreground">
                منصة موحّدة لبناء الاختبارات، والتقديم الوظيفي، والاستبيانات
                والاستطلاعات — مع أنواع بيانات متعددة، وقوالب جاهزة، ولوحة ردود
                تفصيلية، وتصدير بأكثر من صيغة.
              </p>
              <div className="mt-6 flex flex-wrap gap-8 text-sm">
                <Stat n={projects.length} label="مشروع" />
                <Stat n={formCount} label="نموذج" />
                <Stat n={responseCount} label="رد" />
              </div>
            </div>
            <NafLogo className="hidden h-32 w-32 animate-floaty md:block" />
          </div>
        </section>

        {/* المشاريع */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">المشاريع</h2>
            <CreateProjectButton />
          </div>
          {projects.length === 0 ? (
            <Card className="grid place-items-center p-12 text-center text-muted-foreground">
              <Icon name="folder" className="mb-2 h-10 w-10 text-muted-foreground" />
              لم تُنشئ أي مشروع بعد. ابدأ بإنشاء أول مشروع لتنظيم نماذجك.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="group block">
                  <Card className="p-5 transition hover:shadow-md">
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="h-10 w-10 rounded-xl"
                      style={{ background: p.color }}
                    />
                    <div>
                      <h3 className="font-bold group-hover:text-primary">
                        {p.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        <bdi>{p._count.forms}</bdi> نموذج
                      </p>
                    </div>
                  </div>
                  {p.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      آخر تحديث: <bdi>{formatDateTime(p.updatedAt)}</bdi>
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* القوالب الجاهزة */}
        <section>
          <h2 className="mb-1 text-xl font-bold">قوالب جاهزة</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            ابدأ سريعًا بنموذج مبني مسبقًا، ثم خصّصه كما تشاء.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="p-5">
                <span className={`chip ${FORM_TYPE_CHIP[t.type]}`}>
                  {FORM_TYPE_LABELS[t.type]}
                </span>
                <h3 className="mt-3 font-bold">{t.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {t.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <bdi>{t._count.questions}</bdi> سؤال
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-card-foreground">{n}</div>
      <div className="text-primary">{label}</div>
    </div>
  );
}
