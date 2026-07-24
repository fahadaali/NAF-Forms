"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "@/components/ui/Icon";

export default function ShareTools({ url }: { url: string }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    QRCode.toDataURL(url, { width: 220, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  const embed = `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:0;border-radius:16px"></iframe>`;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="card p-6 text-center">
        <h3 className="mb-3 font-bold">رمز QR</h3>
        {qr ? (
          <img src={qr} alt="QR" className="mx-auto rounded-xl border border-slate-200" />
        ) : (
          <div className="mx-auto grid h-[220px] w-[220px] place-items-center text-slate-300">
            جارٍ التوليد…
          </div>
        )}
        {qr && (
          <a
            href={qr}
            download="naf-form-qr.png"
            className="btn-ghost mt-4 inline-flex items-center gap-1.5 text-sm"
          >
            <Icon name="download" className="h-4 w-4" /> تنزيل الرمز
          </a>
        )}
      </div>

      <div className="card p-6">
        <h3 className="mb-2 font-bold">كود التضمين (Embed)</h3>
        <p className="mb-2 text-sm text-slate-500">
          ألصق هذا الكود في موقعك لعرض النموذج داخله.
        </p>
        <textarea className="input h-24 font-mono text-xs" dir="ltr" readOnly value={embed} />
        <button
          className="btn-ghost mt-2 inline-flex items-center gap-1.5 text-sm"
          onClick={() => copy(embed, "embed")}
        >
          {copied === "embed" ? (
            <>
              <Icon name="check" className="h-4 w-4" /> تم النسخ
            </>
          ) : (
            "نسخ الكود"
          )}
        </button>
      </div>
    </div>
  );
}
