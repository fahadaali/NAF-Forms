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
  }));

  return (
    <AppChrome crumbs={[{ label: "المستخدمون" }]} width="narrow">
        <h1 className="mb-1 text-2xl font-bold">تهيئة مسبقة</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          سجّل بريد العضو وصلاحيته قبل أول دخول له، فيأخذها عند دخوله بدل
          الصلاحية الافتراضية. وبعد دخوله تُدار صلاحيته من «الفريق
          والصلاحيات».
        </p>
        <UsersManager initial={users} meId={admin.uid} />
    </AppChrome>
  );
}
