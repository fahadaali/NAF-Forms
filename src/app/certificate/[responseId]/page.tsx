import { notFound } from "next/navigation";
import { getResponseWithAnswers, getFormWithQuestions } from "@/lib/repo";
import { parseSettings, safeParse, formatDateTime } from "@/lib/utils";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// شهادة إتمام قابلة للطباعة للناجحين في الاختبار.
// الوصول عبر معرّف الرد (عشوائي وغير قابل للتخمين) لأن المستفيد غير مسجّل دخول.
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ responseId: string }>;
}) {
  const response = await getResponseWithAnswers((await params).responseId);
  if (!response) notFound();

  const form = await getFormWithQuestions(response.formId);
  if (!form || form.type !== "EXAM") notFound();

  const settings = parseSettings(form.settings);
  if (!settings.exam?.certificate) notFound();

  const meta = safeParse<any>(response.meta, {});
  const score = Number(meta.score ?? 0);
  const total = Number(meta.total ?? 0);
  const passScore = settings.exam?.passScore;
  const passed = passScore != null ? score >= Number(passScore) : true;
  // لا تُصدر شهادة لمن لم يجتز
  if (!passed) notFound();

  const theme = settings.theme || {};
  const accent = theme.primary || "#44528a";
  const title = settings.exam?.certificateTitle || "شهادة إتمام";

  return (
    <div className="min-h-screen bg-muted p-6 print:bg-card print:p-0">
      <div className="mx-auto max-w-3xl">
        <PrintButton />
        <div
          className="relative overflow-hidden rounded-3xl bg-card p-12 text-center shadow-xl print:rounded-none print:shadow-none"
          style={{ borderTop: `8px solid ${accent}` }}
        >
          <img
            src="/naf-logo.jpg"
            alt="ناف"
            className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover"
          />
          <h1 className="text-3xl font-bold" style={{ color: accent }}>
            {title}
          </h1>
          <p className="mt-6 text-muted-foreground">تشهد منصة ناف بأن</p>
          <p className="mt-2 text-2xl font-bold">
            {meta.email || "المستفيد"}
          </p>
          <p className="mt-4 text-muted-foreground">
            قد أتمّ بنجاح «<span className="font-semibold">{form.title}</span>»
          </p>

          {total > 0 && (
            <div
              className="mx-auto mt-8 inline-block rounded-2xl px-10 py-4 text-white"
              style={{ background: accent }}
            >
              <div className="text-sm opacity-90">الدرجة</div>
              <div className="text-3xl font-bold">
                {score} / {total}
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground">
            <span>تاريخ الإصدار: {formatDateTime(response.submittedAt)}</span>
            <span dir="ltr">رقم الشهادة: {response.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
