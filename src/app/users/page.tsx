import { redirect } from "next/navigation";
import { listUsers } from "@/lib/repo";
import { requireAdmin } from "@/lib/session";
import AppChrome from "@/components/AppChrome";
import UsersManager from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const users = (await listUsers()).map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
  }));

  return (
    <AppChrome crumbs={[{ label: "المستخدمون" }]} width="narrow">
        <h1 className="mb-1 text-2xl font-bold">المستخدمون</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          إدارة حسابات لوحة التحكم وأدوارها.
        </p>
        <UsersManager initial={users} meId={admin.uid} />
    </AppChrome>
  );
}
