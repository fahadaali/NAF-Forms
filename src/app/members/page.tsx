import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { listMembers } from "@/lib/members";
import { H_SUB } from "@/lib/sso";
import Navbar from "@/components/Navbar";
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
    <div className="min-h-screen">
      <Navbar crumbs={[{ label: "الفريق والصلاحيات" }]} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold">الفريق والصلاحيات</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          الأعضاء يصلون من الدخول الموحّد، والصلاحية تُوزَّع من هنا.
        </p>
        <MembersManager initial={members} meId={meId} />
      </main>
    </div>
  );
}
