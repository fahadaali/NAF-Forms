"use client";
import type { FormSettings } from "@/lib/types";
import { youtubeEmbed } from "@/lib/utils";

export default function DesignPanel({
  settings,
  onChange,
}: {
  settings: FormSettings;
  onChange: (s: FormSettings) => void;
}) {
  const patch = (part: Partial<FormSettings>) => onChange({ ...settings, ...part });
  const theme = settings.theme || {};
  const cover = settings.cover || {};
  const content = settings.content || {};
  const after = settings.afterSubmit || {};
  const behavior = settings.behavior || {};

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
      <section className="card p-5">
        <h3 className="mb-4 font-bold">🎨 الألوان</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Color label="اللون الأساسي" value={theme.primary} onChange={(v) => patch({ theme: { ...theme, primary: v } })} />
          <Color label="الخلفية" value={theme.background} onChange={(v) => patch({ theme: { ...theme, background: v } })} />
          <Color label="لون النص" value={theme.text} onChange={(v) => patch({ theme: { ...theme, text: v } })} />
          <Color label="خلفية البطاقة" value={theme.cardBg} onChange={(v) => patch({ theme: { ...theme, cardBg: v } })} />
        </div>
      </section>

      {/* الغلاف والوسائط */}
      <section className="card p-5">
        <h3 className="mb-4 font-bold">🖼️ الغلاف والوسائط</h3>
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
            <input
              className="input"
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
      </section>

      {/* الروابط والملفات */}
      <section className="card p-5">
        <h3 className="mb-4 font-bold">🔗 روابط وملفات إضافية</h3>
        <label className="label">روابط</label>
        <div className="space-y-2">
          {(content.links || []).map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input py-1.5"
                placeholder="عنوان الرابط"
                value={l.label}
                onChange={(e) => {
                  const links = [...(content.links || [])];
                  links[i] = { ...links[i], label: e.target.value };
                  patch({ content: { ...content, links } });
                }}
              />
              <input
                className="input py-1.5"
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
                className="px-2 text-red-500"
                onClick={() =>
                  patch({
                    content: {
                      ...content,
                      links: (content.links || []).filter((_, x) => x !== i),
                    },
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-2 text-sm font-medium text-naf-600 hover:underline"
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
            <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
              <span className="flex-1 truncate">📄 {f.name}</span>
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
                className="px-2 text-red-500"
                onClick={() =>
                  patch({
                    content: {
                      ...content,
                      files: (content.files || []).filter((_, x) => x !== i),
                    },
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <label className="mt-2 inline-block cursor-pointer text-sm font-medium text-naf-600 hover:underline">
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
      </section>

      {/* رسالة ما بعد الإرسال */}
      <section className="card p-5">
        <h3 className="mb-4 font-bold">✅ رسالة ما بعد الإرسال</h3>
        <label className="label">العنوان</label>
        <input
          className="input mb-3"
          value={after.title || ""}
          onChange={(e) => patch({ afterSubmit: { ...after, title: e.target.value } })}
        />
        <label className="label">الرسالة</label>
        <textarea
          className="input mb-3"
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
      </section>

      {/* السلوك */}
      <section className="card p-5">
        <h3 className="mb-4 font-bold">⚙️ سلوك صفحة التقديم</h3>
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
            label="طلب بريد المستفيد قبل البدء"
            checked={!!behavior.collectEmail}
            onChange={(v) => patch({ behavior: { ...behavior, collectEmail: v } })}
          />
        </div>
      </section>

      {/* الوصول والخصوصية */}
      <section className="card p-5">
        <h3 className="mb-2 font-bold">🔒 الوصول والخصوصية</h3>
        <p className="mb-3 text-sm text-slate-500">
          اترك الحقل فارغًا لجعل النموذج متاحًا للجميع، أو حدّد كلمة مرور لحمايته.
        </p>
        <label className="label">كلمة مرور النموذج</label>
        <input
          className="input"
          dir="ltr"
          placeholder="بدون كلمة مرور"
          value={settings.access?.password || ""}
          onChange={(e) =>
            patch({ access: { ...settings.access, password: e.target.value } })
          }
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">حد أقصى لعدد الردود</label>
            <input
              type="number"
              min={0}
              className="input"
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
            <input
              type="datetime-local"
              className="input"
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
      </section>

      {/* الإشعارات */}
      <section className="card p-5">
        <h3 className="mb-2 font-bold">🔔 إشعار بريد عند وصول رد</h3>
        <p className="mb-3 text-sm text-slate-500">
          أدخل بريدًا لاستقبال إشعار عند كل رد جديد (يتطلب ضبط SMTP في الخادم).
        </p>
        <label className="label">بريد الإشعارات</label>
        <input
          className="input"
          dir="ltr"
          placeholder="notify@example.com"
          value={settings.notify?.email || ""}
          onChange={(e) =>
            patch({ notify: { ...settings.notify, email: e.target.value } })
          }
        />
      </section>
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
          className="h-9 w-12 cursor-pointer rounded"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input className="input py-1.5" dir="ltr" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
