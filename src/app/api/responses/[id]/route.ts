import { NextResponse } from "next/server";
import { deleteResponse } from "@/lib/repo";

// حذف رد فردي
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await deleteResponse((await params).id);
  return NextResponse.json({ ok: true });
}
