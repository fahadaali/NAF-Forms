import { NextResponse } from "next/server";
import { getFormWithResponses } from "@/lib/repo";
import { authorizeForm } from "@/lib/session";
import * as XLSX from "xlsx";
import { safeParse, answerToText, formatDateTime, isInputQuestion } from "@/lib/utils";

export const runtime = "nodejs";

// تصدير الردود بصيغة CSV أو JSON أو XLSX مع تاريخ ووقت كل رد.
// يقبل نفس فلاتر اللوحة (q / from / to) حتى يطابق التصدير ما يراه المستخدم.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const formId = (await params).id;
  if (!(await authorizeForm(formId)))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const form = await getFormWithResponses(formId);
  if (!form)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const questions = form.questions.filter((q) => isInputQuestion(q.type));
  const allRows = form.responses.map((r) => {
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
      record[q.label] = answerToText(
        q.type,
        byQ[q.id],
        safeParse<Record<string, any>>(q.config, {})
      );
    }
    // نحتفظ بالطابع الزمني الأصلي للتصفية دون إظهاره في المخرجات
    return { record, ts: r.submittedAt.getTime() };
  });

  // تطبيق الفلاتر بنفس منطق لوحة الردود
  const rows = allRows
    .filter(({ record, ts }) => {
      if (query) {
        const hay = Object.values(record).join(" ").toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (from && ts < new Date(from).getTime()) return false;
      // نهاية اليوم المحدد
      if (to && ts > new Date(to).getTime() + 86_399_000) return false;
      return true;
    })
    .map(({ record }) => record);

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
  // (عمود البريد يظهر فقط إن وُجد في الردود المُصدَّرة بعد التصفية)
  const hasEmail = rows.some((r) => r["البريد الإلكتروني"]);
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
