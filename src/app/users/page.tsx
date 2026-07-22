import { redirect } from "next/navigation";
import { listUsers } from "@/lib/repo";
import { requireAdmin } from "@/lib/session";
import Navbar from "@/components/Navbar";
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
    <div className="min-h-screen">
      <Navbar crumbs={[{ label: "المستخدمون" }]} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold">المستخدمون</h1>
        <p className="mb-6 text-sm text-slate-500">
          إدارة حسابات لوحة التحكم وأدوارها.
        </p>
        <UsersManager initial={users} meId={admin.uid} />
      </main>
    </div>
  );
}
