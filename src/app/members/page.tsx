import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { listMembers } from "@/lib/members";
import { H_SUB } from "@/lib/sso";
import AppChrome from "@/components/AppChrome";
import MembersManager from "@/components/MembersManager";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  // معرّف المركز لا المعرّف المحلي: صفوف الجدول مفتاحها `sub`، و`admin.uid`
  // هو المعرّف المحلي المربوط — فالمقارنة بينهما لا تتطابق أبداً.
  const meId = (await headers()).get(H_SUB) ?? "";
  const members = await listMembers();

  return (
    <AppChrome crumbs={[{ label: "الفريق والصلاحيات" }]} width="narrow">
        <h1 className="mb-6 text-2xl font-bold">الفريق والصلاحيات</h1>
        <MembersManager initial={members} meId={meId} />
    </AppChrome>
  );
}
