"use client";
import { Icon } from "@/components/ui/Icon";

export default function LogoutButton() {
  // تنقّلٌ كامل بالمتصفح لا `router.push`.
  //
  // بعد الخروج لا جلسة، فأوّل طلبٍ يردّه الوسيط تحويلةً إلى نطاق المركز.
  // و`router.push` تجلب المسار بـ`fetch`، والمتصفّح لا يتبع تحويلةً إلى
  // أصل آخر بلا `CORS` — فيسقط الطلب بخطأ شبكة ويبقى المستخدم مكانه
  // وشاشته فارغة. والتنقّل الكامل يتبعها ويصل إلى الباب.
  //
  // والوجهة `/` لا `/login`: باب كلمة المرور أُغلق، والباب في المركز.
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }
  return (
    <button
      onClick={logout}
      aria-label="تسجيل الخروج"
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
    >
      <Icon name="logout" className="h-4 w-4" />
      <span className="hidden sm:inline">تسجيل الخروج</span>
    </button>
  );
}
