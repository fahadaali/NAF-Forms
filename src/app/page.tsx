import Link from "next/link";
import { listProjects, listTemplates, countForms, countResponses } from "@/lib/repo";
import { FORM_TYPE_LABELS, FORM_TYPE_CHIP } from "@/lib/field-types";
import { formatDateTime } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import CreateProjectButton from "@/components/CreateProjectButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, templates, formCount, responseCount] = await Promise.all([
    listProjects(),
    listTemplates(),
    countForms(false),
    countResponses(),
  ]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* بطاقة ترحيبية */}
        <section
          className="relative mb-8 overflow-hidden rounded-3xl border border-brand-taupe/20 p-8 md:p-10"
          style={{ background: "linear-gradient(135deg, #2a3149, #232840 55%, #1c2338)" }}
        >
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.15]" />
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(180,167,143,0.35), transparent 70%)" }}
          />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold text-brand-cream md:text-4xl">
                نظام استبانات <span className="text-brand-taupe">ناف</span>
              </h1>
              <p className="mt-3 leading-relaxed text-slate-300">
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
            <img
              src="/naf-logo.jpg"
              alt="ناف"
              className="hidden h-32 w-32 animate-floaty rounded-3xl object-cover shadow-glow ring-1 ring-brand-taupe/40 md:block"
            />
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
                <span className={`chip ${FORM_TYPE_CHIP[t.type]}`}>
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
      <div className="text-3xl font-extrabold text-brand-cream">{n}</div>
      <div className="text-brand-taupe">{label}</div>
    </div>
  );
}
