import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FORM_TYPE_LABELS } from "@/lib/field-types";
import { formatDateTime } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import CreateProjectButton from "@/components/CreateProjectButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, templates, formCount, responseCount] = await Promise.all([
    prisma.project.findMany({
      where: { id: { not: "system-templates" } },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { forms: { where: { isTemplate: false } } } },
      },
    }),
    prisma.form.findMany({
      where: { isTemplate: true },
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.form.count({ where: { isTemplate: false } }),
    prisma.response.count(),
  ]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* بطاقة ترحيبية */}
        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-l from-naf-700 to-naf-500 p-8 text-white shadow-lg">
          <h1 className="text-3xl font-extrabold">نظام استبانات ناف</h1>
          <p className="mt-2 max-w-2xl text-naf-100">
            منصة موحّدة لبناء الاختبارات، والتقديم الوظيفي، والاستبيانات
            والاستطلاعات — مع أنواع بيانات متعددة، وقوالب جاهزة، ولوحة ردود
            تفصيلية، وتصدير بأكثر من صيغة.
          </p>
          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <Stat n={projects.length} label="مشروع" />
            <Stat n={formCount} label="نموذج" />
            <Stat n={responseCount} label="رد" />
          </div>
        </section>

        {/* المشاريع */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">المشاريع</h2>
            <CreateProjectButton />
          </div>
          {projects.length === 0 ? (
            <div className="card grid place-items-center p-12 text-center text-slate-500">
              <span className="mb-2 text-4xl">📁</span>
              لا توجد مشاريع بعد — أنشئ مشروعك الأول لتنظيم نماذجك.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="card group p-5 transition hover:shadow-md"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="h-10 w-10 rounded-xl"
                      style={{ background: p.color }}
                    />
                    <div>
                      <h3 className="font-bold group-hover:text-naf-700">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {p._count.forms} نموذج
                      </p>
                    </div>
                  </div>
                  {p.description && (
                    <p className="line-clamp-2 text-sm text-slate-500">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-slate-400">
                    آخر تحديث: {formatDateTime(p.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* القوالب الجاهزة */}
        <section>
          <h2 className="mb-1 text-xl font-bold">قوالب جاهزة</h2>
          <p className="mb-4 text-sm text-slate-500">
            ابدأ سريعًا بنموذج مبني مسبقًا، ثم خصّصه كما تشاء.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="card p-5">
                <span className="chip bg-naf-50 text-naf-700">
                  {FORM_TYPE_LABELS[t.type]}
                </span>
                <h3 className="mt-3 font-bold">{t.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {t.description}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {t._count.questions} سؤال
                </p>
              </div>
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
      <div className="text-2xl font-extrabold">{n}</div>
      <div className="text-naf-100">{label}</div>
    </div>
  );
}
