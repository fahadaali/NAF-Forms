import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeParse, answerToText, formatDateTime } from "@/lib/utils";

// تصدير الردود بصيغة CSV أو JSON مع تاريخ ووقت كل رد
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";

  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: {
        orderBy: { submittedAt: "desc" },
        include: { answers: true },
      },
    },
  });
  if (!form)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const questions = form.questions;
  const rows = form.responses.map((r) => {
    const byQ: Record<string, any> = {};
    for (const a of r.answers) byQ[a.questionId] = safeParse(a.value, "");
    const meta = safeParse<any>(r.meta, {});
    const record: Record<string, any> = {
      "رقم الرد": r.id,
      "تاريخ ووقت التقديم": formatDateTime(r.submittedAt),
    };
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
  const headers = [
    "رقم الرد",
    "تاريخ ووقت التقديم",
    ...(form.type === "EXAM" ? ["الدرجة"] : []),
    ...questions.map((q) => q.label),
  ];
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
