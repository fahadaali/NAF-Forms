import { NextResponse } from "next/server";
import { getFormWithResponses } from "@/lib/repo";
import * as XLSX from "xlsx";
import { safeParse, answerToText, formatDateTime, isInputQuestion } from "@/lib/utils";

export const runtime = "nodejs";

// تصدير الردود بصيغة CSV أو JSON أو XLSX مع تاريخ ووقت كل رد
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";

  const form = await getFormWithResponses((await params).id);
  if (!form)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const questions = form.questions.filter((q) => isInputQuestion(q.type));
  const rows = form.responses.map((r) => {
    const byQ: Record<string, any> = {};
    for (const a of r.answers) byQ[a.questionId] = safeParse(a.value, "");
    const meta = safeParse<any>(r.meta, {});
    const record: Record<string, any> = {
      "رقم الرد": r.id,
      "تاريخ ووقت التقديم": formatDateTime(r.submittedAt),
    };
    if (meta.email) record["البريد الإلكتروني"] = meta.email;
    if (form.type === "EXAM")
      record["الدرجة"] = `${meta.score ?? 0} / ${meta.total ?? 0}`;
    for (const q of questions) {
      record[q.label] = answerToText(q.type, byQ[q.id]);
    }
    return record;
  });

  // اسم ملف آمن للترويسة (ASCII) مع نسخة UTF-8 وفق RFC 5987
  const disposition = (ext: string) =>
    `attachment; filename="responses-${form.id}.${ext}"; filename*=UTF-8''${encodeURIComponent(
      `ردود-${form.slug}.${ext}`
    )}`;

  if (format === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": disposition("json"),
      },
    });
  }

  // CSV مع BOM لدعم العربية في Excel
  const hasEmail = form.responses.some(
    (r) => safeParse<any>(r.meta, {}).email
  );
  const headers = [
    "رقم الرد",
    "تاريخ ووقت التقديم",
    ...(hasEmail ? ["البريد الإلكتروني"] : []),
    ...(form.type === "EXAM" ? ["الدرجة"] : []),
    ...questions.map((q) => q.label),
  ];

  // تصدير Excel (.xlsx)
  if (format === "xlsx") {
    const aoa = [headers, ...rows.map((row) => headers.map((h) => row[h] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الردود");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": disposition("xlsx"),
      },
    });
  }

  const esc = (v: any) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((row) => headers.map((h) => esc(row[h])).join(",")),
  ];
  const csv = "﻿" + lines.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": disposition("csv"),
    },
  });
}
