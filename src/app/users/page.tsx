import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import Navbar from "@/components/Navbar";
import UsersManager from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, mustChangePassword: true },
  });

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
