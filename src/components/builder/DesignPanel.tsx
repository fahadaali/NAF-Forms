"use client";
import { useState } from "react";
import type { FormSettings } from "@/lib/types";
import { youtubeEmbed } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, inputVariants } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

// ترويسة قسم بأيقونة منحنية
function SectionHead({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 font-bold">
      <Icon name={icon} className="h-5 w-5 text-primary" />
      {children}
    </h3>
  );
}

export default function DesignPanel({
  settings,
  onChange,
  formType,
  formId,
}: {
  settings: FormSettings;
  onChange: (s: FormSettings) => void;
  formType: string;
  formId: string;
}) {
  const patch = (part: Partial<FormSettings>) => onChange({ ...settings, ...part });
  const theme = settings.theme || {};
  const cover = settings.cover || {};
  const content = settings.content || {};
  const after = settings.afterSubmit || {};
  const behavior = settings.behavior || {};
  const exam = settings.exam || {};
  const integrations = settings.integrations || {};

  async function uploadCover(file: File, key: "imageUrl" | "logoUrl") {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    patch({ cover: { ...cover, [key]: data.url } });
  }

  return (
    <div className="space-y-6">
      {/* الألوان */}
      <Card className="p-5">
        <SectionHead icon="palette">الألوان</SectionHead>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Color label="اللون الأساسي" value={theme.primary} onChange={(v) => patch({ theme: { ...theme, primary: v } })} />
          <Color label="الخلفية" value={theme.background} onChange={(v) => patch({ theme: { ...theme, background: v } })} />
          <Color label="لون النص" value={theme.text} onChange={(v) => patch({ theme: { ...theme, text: v } })} />
          <Color label="خلفية البطاقة" value={theme.cardBg} onChange={(v) => patch({ theme: { ...theme, cardBg: v } })} />
        </div>
      </Card>

      {/* الغلاف والوسائط */}
      <Card className="p-5">
        <SectionHead icon="image">الغلاف والوسائط</SectionHead>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">صورة الغلاف</label>
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0], "imageUrl")}
            />
            {cover.imageUrl && (
              <img src={cover.imageUrl} alt="" className="mt-2 h-24 rounded-lg object-cover" />
            )}
          </div>
          <div>
            <label className="label">الشعار</label>
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0], "logoUrl")}
            />
            {cover.logoUrl && (
              <img src={cover.logoUrl} alt="" className="mt-2 h-16 rounded-lg object-contain" />
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label">رابط مقطع يوتيوب (يُعرض داخل صفحة التقديم)</label>
            <Input
              dir="ltr"
              placeholder="https://youtube.com/watch?v=..."
              value={cover.youtubeUrl || ""}
              onChange={(e) => patch({ cover: { ...cover, youtubeUrl: e.target.value } })}
            />
            {youtubeEmbed(cover.youtubeUrl) && (
              <iframe
                className="mt-2 aspect-video w-full max-w-md rounded-lg"
                src={youtubeEmbed(cover.youtubeUrl)!}
                allowFullScreen
              />
            )}
          </div>
        </div>
      </Card>

      {/* الروابط والملفات */}
      <Card className="p-5">
        <SectionHead icon="link">روابط وملفات إضافية</SectionHead>
        <label className="label">روابط</label>
        <div className="space-y-2">
          {(content.links || []).map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input size="sm"
                placeholder="عنوان الرابط"
                value={l.label}
                onChange={(e) => {
                  const links = [...(content.links || [])];
                  links[i] = { ...links[i], label: e.target.value };
                  patch({ content: { ...content, links } });
                }}
              />
              <Input size="sm"
                dir="ltr"
                placeholder="https://..."
                value={l.url}
                onChange={(e) => {
                  const links = [...(content.links || [])];
                  links[i] = { ...links[i], url: e.target.value };
                  patch({ content: { ...content, links } });
                }}
              />
              <button
                className="px-2 text-destructive"
                onClick={() =>
                  patch({
                    content: {
                      ...content,
                      links: (content.links || []).filter((_, x) => x !== i),
                    },
                  })
                }
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-2 text-sm font-medium text-primary hover:underline"
          onClick={() =>
            patch({
              content: {
                ...content,
                links: [...(content.links || []), { label: "", url: "" }],
              },
            })
          }
        >
          + إضافة رابط
        </button>

        <label className="label mt-5">ملفات للعرض/التنزيل داخل الصفحة</label>
        <div className="space-y-2">
          {(content.files || []).map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
              <span className="flex-1 inline-flex items-center gap-1.5 truncate"><Icon name="paperclip" className="h-4 w-4 shrink-0" /> {f.name}</span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={f.downloadable}
                  onChange={(e) => {
                    const files = [...(content.files || [])];
                    files[i] = { ...files[i], downloadable: e.target.checked };
                    patch({ content: { ...content, files } });
                  }}
                />
                يمكن تنزيله
              </label>
              <button
                className="px-2 text-destructive"
                onClick={() =>
                  patch({
                    content: {
                      ...content,
                      files: (content.files || []).filter((_, x) => x !== i),
                    },
                  })
                }
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <label className="mt-2 inline-block cursor-pointer text-sm font-medium text-primary hover:underline">
          + رفع ملف
          <input
            type="file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/upload", { method: "POST", body: fd });
              const data = await res.json();
              patch({
                content: {
                  ...content,
                  files: [
                    ...(content.files || []),
                    { name: file.name, url: data.url, downloadable: true },
                  ],
                },
              });
            }}
          />
        </label>
      </Card>

      {/* رسالة ما بعد الإرسال */}
      <Card className="p-5">
        <SectionHead icon="check-circle">رسالة ما بعد الإرسال</SectionHead>
        <label className="label">العنوان</label>
        <Input
          className="mb-3"
          value={after.title || ""}
          onChange={(e) => patch({ afterSubmit: { ...after, title: e.target.value } })}
        />
        <label className="label">الرسالة</label>
        <textarea
          className={cn(inputVariants(), "h-auto py-2 mb-3")}
          value={after.message || ""}
          onChange={(e) => patch({ afterSubmit: { ...after, message: e.target.value } })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!after.showScore}
            onChange={(e) => patch({ afterSubmit: { ...after, showScore: e.target.checked } })}
          />
          إظهار الدرجة بعد التسليم (للاختبارات)
        </label>
        <label className="label mt-4">رابط إعادة التوجيه بعد الإرسال (اختياري)</label>
        <Input
          dir="ltr"
          placeholder="https://..."
          value={after.redirectUrl || ""}
          onChange={(e) =>
            patch({ afterSubmit: { ...after, redirectUrl: e.target.value } })
          }
        />
      </Card>

      {/* السلوك */}
      <Card className="p-5">
        <SectionHead icon="gear">سلوك صفحة التقديم</SectionHead>
        <div className="space-y-2 text-sm">
          <Toggle
            label="عرض سؤال واحد في كل بطاقة"
            checked={behavior.oneQuestionPerCard !== false}
            onChange={(v) => patch({ behavior: { ...behavior, oneQuestionPerCard: v } })}
          />
          <Toggle
            label="السماح بالرجوع للسؤال السابق"
            checked={behavior.allowBack !== false}
            onChange={(v) => patch({ behavior: { ...behavior, allowBack: v } })}
          />
          <Toggle
            label="إظهار شريط التقدم"
            checked={behavior.showProgress !== false}
            onChange={(v) => patch({ behavior: { ...behavior, showProgress: v } })}
          />
          <Toggle
            label="الانتقال التلقائي عند اختيار إجابة واحدة أو الموافقة"
            checked={behavior.autoAdvance !== false}
            onChange={(v) => patch({ behavior: { ...behavior, autoAdvance: v } })}
          />
          <Toggle
            label="السماح بحفظ الإجابات ومتابعتها لاحقًا برابط"
            checked={!!behavior.allowSaveResume}
            onChange={(v) =>
              patch({ behavior: { ...behavior, allowSaveResume: v } })
            }
          />
          <Toggle
            label="طلب بريد المستفيد قبل البدء"
            checked={!!behavior.collectEmail}
            onChange={(v) => patch({ behavior: { ...behavior, collectEmail: v } })}
          />
        </div>
      </Card>

      {/* الوصول والخصوصية */}
      <Card className="p-5">
        <SectionHead icon="lock">الوصول والخصوصية</SectionHead>
        <p className="mb-3 text-sm text-muted-foreground">
          اترك الحقل فارغًا لجعل النموذج متاحًا للجميع، أو حدّد كلمة مرور لحمايته.
        </p>
        <label className="label">كلمة مرور النموذج</label>
        <Input
          dir="ltr"
          placeholder="بدون كلمة مرور"
          value={settings.access?.password || ""}
          onChange={(e) =>
            patch({ access: { ...settings.access, password: e.target.value } })
          }
        />
        <div className="mt-3">
          <Toggle
            label="منع تكرار التقديم بنفس البريد الإلكتروني"
            checked={!!settings.access?.oneResponsePerEmail}
            onChange={(v) =>
              patch({
                access: { ...settings.access, oneResponsePerEmail: v },
                // المنع يتطلب جمع البريد، فنُفعّله تلقائيًا
                behavior: v
                  ? { ...settings.behavior, collectEmail: true }
                  : settings.behavior,
              })
            }
          />
          {settings.access?.oneResponsePerEmail && (
            <p className="mt-1 text-xs text-muted-foreground">
              يتطلب جمع بريد المستفيد (مُفعّل تلقائيًا).
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">حد أقصى لعدد الردود</label>
            <Input
              type="number"
              min={0}
              placeholder="بلا حد"
              value={settings.limits?.maxResponses ?? ""}
              onChange={(e) =>
                patch({
                  limits: {
                    ...settings.limits,
                    maxResponses: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
            />
          </div>
          <div>
            <label className="label">تاريخ الإغلاق التلقائي</label>
            <Input
              type="datetime-local"
              value={settings.limits?.closeAt || ""}
              onChange={(e) =>
                patch({
                  limits: {
                    ...settings.limits,
                    closeAt: e.target.value || null,
                  },
                })
              }
            />
          </div>
        </div>
      </Card>

      {/* الإشعارات */}
      <Card className="p-5">
        <SectionHead icon="bell">إشعار بريد عند وصول رد</SectionHead>
        <p className="mb-3 text-sm text-muted-foreground">
          أدخل بريدًا لاستقبال إشعار عند كل رد جديد (يتطلب ضبط SMTP في الخادم).
        </p>
        <label className="label">بريد الإشعارات</label>
        <Input
          dir="ltr"
          placeholder="notify@example.com"
          value={settings.notify?.email || ""}
          onChange={(e) =>
            patch({ notify: { ...settings.notify, email: e.target.value } })
          }
        />

        <label className="label mt-4">رابط Webhook (اختياري)</label>
        <Input
          dir="ltr"
          placeholder="https://example.com/webhook"
          value={settings.notify?.webhookUrl || ""}
          onChange={(e) =>
            patch({ notify: { ...settings.notify, webhookUrl: e.target.value } })
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">
          يُرسل بيانات كل رد إلى هذا الرابط (يعمل مع Slack/Zapier وغيرها).
        </p>

        <div className="mt-4">
          <Toggle
            label="إرسال رسالة تأكيد للمستفيد بعد التقديم"
            checked={!!settings.notify?.confirmToRespondent}
            onChange={(v) =>
              patch({ notify: { ...settings.notify, confirmToRespondent: v } })
            }
          />
        </div>
        {settings.notify?.confirmToRespondent && (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="عنوان رسالة التأكيد"
              value={settings.notify?.confirmSubject || ""}
              onChange={(e) =>
                patch({ notify: { ...settings.notify, confirmSubject: e.target.value } })
              }
            />
            <textarea
              className={cn(inputVariants(), "h-auto py-2")}
              placeholder="نص رسالة التأكيد"
              value={settings.notify?.confirmMessage || ""}
              onChange={(e) =>
                patch({ notify: { ...settings.notify, confirmMessage: e.target.value } })
              }
            />
          </div>
        )}
      </Card>

      {/* التكاملات الخارجية */}
      <Card className="p-5">
        <SectionHead icon="layers">التكاملات الخارجية</SectionHead>
        <IntegrationsPanel
          formId={formId}
          integrations={integrations}
          onChange={(next) => patch({ integrations: next })}
        />
      </Card>

      {/* إعدادات الاختبار */}
      {formType === "EXAM" && (
        <Card className="p-5">
          <SectionHead icon="edit">إعدادات الاختبار</SectionHead>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">مدة الاختبار (دقائق)</label>
              <Input
                type="number"
                min={0}
                placeholder="بلا حد"
                value={exam.timeLimitMin ?? ""}
                onChange={(e) =>
                  patch({
                    exam: {
                      ...exam,
                      timeLimitMin: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="label">درجة النجاح</label>
              <Input
                type="number"
                min={0}
                placeholder="بدون"
                value={exam.passScore ?? ""}
                onChange={(e) =>
                  patch({
                    exam: {
                      ...exam,
                      passScore: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="label">
                عدد الأسئلة المعروضة (بنك أسئلة عشوائي)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="كل الأسئلة"
                value={exam.questionCount ?? ""}
                onChange={(e) =>
                  patch({
                    exam: {
                      ...exam,
                      questionCount: e.target.value
                        ? Number(e.target.value)
                        : null,
                    },
                  })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                يُختار هذا العدد عشوائيًا من أسئلة الاختبار لكل مستفيد.
              </p>
            </div>
            <div>
              <label className="label">أقصى عدد محاولات لكل بريد</label>
              <Input
                type="number"
                min={0}
                placeholder="بلا حد"
                value={exam.maxAttempts ?? ""}
                onChange={(e) =>
                  patch({
                    exam: {
                      ...exam,
                      maxAttempts: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                يتطلّب تفعيل «طلب بريد المستفيد قبل البدء».
              </p>
            </div>
          </div>

          {/* الشهادة */}
          <div className="mt-4 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!exam.certificate}
                onChange={(e) =>
                  patch({ exam: { ...exam, certificate: e.target.checked } })
                }
              />
              إصدار شهادة قابلة للطباعة للناجحين
            </label>
            {exam.certificate && (
              <div className="mt-2">
                <label className="label">عنوان الشهادة</label>
                <Input
                  placeholder="شهادة إتمام"
                  value={exam.certificateTitle || ""}
                  onChange={(e) =>
                    patch({
                      exam: { ...exam, certificateTitle: e.target.value },
                    })
                  }
                />
              </div>
            )}
          </div>
          <div className="mt-3 space-y-2">
            <Toggle
              label="خلط ترتيب الأسئلة عشوائيًا"
              checked={!!exam.shuffle}
              onChange={(v) => patch({ exam: { ...exam, shuffle: v } })}
            />
            <Toggle
              label="إظهار الإجابات الصحيحة بعد التسليم"
              checked={!!exam.showAnswers}
              onChange={(v) => patch({ exam: { ...exam, showAnswers: v } })}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

// التكاملات: مزامنة Google Sheets + واجهة برمجية للقراءة + سجل التسليم
function IntegrationsPanel({
  formId,
  integrations,
  onChange,
}: {
  formId: string;
  integrations: NonNullable<FormSettings["integrations"]>;
  onChange: (v: NonNullable<FormSettings["integrations"]>) => void;
}) {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadLogs() {
    setBusy(true);
    const res = await fetch(`/api/forms/${formId}/deliveries`);
    setBusy(false);
    if (res.ok) setLogs((await res.json()).deliveries || []);
  }

  async function resend() {
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/forms/${formId}/deliveries`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(d.error || "تعذّر الإرسال");
      return;
    }
    const okAll = (d.results || []).every((r: any) => r.ok);
    setMsg(
      okAll
        ? "تم الإرسال"
        : `فشل بعض الوجهات: ${(d.results || [])
            .filter((r: any) => !r.ok)
            .map((r: any) => `${r.kind} (${r.error || r.status})`)
            .join("، ")}`
    );
    loadLogs();
  }

  const apiUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/forms/${formId}/responses`
      : "";

  return (
    <div className="space-y-5">
      {/* Google Sheets */}
      <div>
        <label className="label">مزامنة Google Sheets — رابط Apps Script</label>
        <Input
          dir="ltr"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={integrations.sheetsUrl || ""}
          onChange={(e) => onChange({ ...integrations, sheetsUrl: e.target.value })}
        />
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-primary">
            كيف أجهّز الرابط؟
          </summary>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-xs text-muted-foreground">
            <li>
              افتح جدول <bdi>Google Sheets</bdi> ثم: الإضافات، ثم{" "}
              <bdi>Apps Script</bdi>.
            </li>
            <li>
              الصق دالة تستقبل <bdi>POST</bdi> وتضيف صفًا، مثل:
              <code className="mt-1 block rounded-sm bg-muted p-2 text-xs" dir="ltr">
                {`function doPost(e){const d=JSON.parse(e.postData.contents);const s=SpreadsheetApp.getActiveSheet();const f=d.fields||{};if(s.getLastRow()===0)s.appendRow(['submittedAt','email',...Object.keys(f)]);s.appendRow([d.submittedAt,d.email,...Object.values(f).map(v=>typeof v==='object'?JSON.stringify(v):v)]);return ContentService.createTextOutput('ok');}`}
              </code>
            </li>
            <li>
              انشر: <bdi>Deploy</bdi>، ثم <bdi>New deployment</bdi>، ثم{" "}
              <bdi>Web app</bdi>، ثم اضبط الوصول على «<bdi>Anyone</bdi>»، وانسخ رابط{" "}
              <bdi>/exec</bdi> هنا.
            </li>
          </ol>
        </details>
      </div>

      {/* واجهة برمجية للقراءة */}
      <div className="border-t border-border pt-4">
        <Toggle
          label="تفعيل واجهة برمجية لقراءة الردود (JSON)"
          checked={!!integrations.apiEnabled}
          onChange={(v) =>
            onChange({
              ...integrations,
              apiEnabled: v,
              // نولّد رمزًا عند التفعيل إن لم يوجد
              apiToken:
                v && !integrations.apiToken
                  ? crypto.randomUUID().replace(/-/g, "")
                  : integrations.apiToken,
            })
          }
        />
        {integrations.apiEnabled && (
          <div className="mt-3 space-y-2">
            <label className="label">رمز الوصول (سرّي)</label>
            <div className="flex gap-2">
              <Input size="sm" dir="ltr" readOnly value={integrations.apiToken || ""} />
              <Button variant="outline" size="sm"
                className="shrink-0"
                onClick={() =>
                  onChange({
                    ...integrations,
                    apiToken: crypto.randomUUID().replace(/-/g, ""),
                  })
                }
              >
                تدوير
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">الاستخدام:</p>
            <code className="block overflow-x-auto rounded-sm bg-muted p-2 text-xs" dir="ltr">
              curl -H &quot;Authorization: Bearer {integrations.apiToken || "TOKEN"}&quot; {apiUrl}
            </code>
            <p className="text-xs text-muted-foreground">
              تدعم <bdi>?limit=</bdi> و<bdi>?since=</bdi> (تاريخ <bdi>ISO</bdi>).
              الرمز سرّي ولا يُرسل لصفحة التعبئة.
            </p>
          </div>
        )}
      </div>

      {/* سجل التسليم */}
      <div className="border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={loadLogs}>
            سجل التسليم
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={resend}>
            إعادة إرسال آخر رد (اختبار)
          </Button>
          {busy && <span className="text-xs text-muted-foreground">جارٍ…</span>}
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </div>
        {logs && (
          <div className="mt-3 space-y-1.5">
            {logs.length === 0 && (
              <p className="text-xs text-muted-foreground">لا توجد عمليات تسليم بعد.</p>
            )}
            {logs.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-xs"
              >
                <span className={`chip ${l.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  {l.ok ? "نجح" : "فشل"}
                </span>
                <span className="text-muted-foreground">{l.kind}</span>
                <span className="text-muted-foreground">HTTP {l.status || "—"}</span>
                <span className="text-muted-foreground">محاولات: {l.attempts}</span>
                {l.error && <span className="text-destructive">{l.error}</span>}
                <span className="ms-auto text-muted-foreground">
                  {formatDateTime(l.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded-sm"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input size="sm" dir="ltr" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
