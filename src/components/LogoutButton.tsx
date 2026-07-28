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
  // والوجهة يقولها الخادم، وهي المركز لا جذر هذه المنصة. كانت `/`: وهو
  // محميّ، فيحوّله الوسيط إلى `/go/NAF-Forms`، وجلسة المركز لم تُمسّ فتُصدر
  // رمزاً جديداً — فيعود الخارجُ إلى شاشته قبل أن يقرأ شيئاً، ويقرأ من ذلك
  // أن الزرّ لا يعمل.
  async function logout() {
    let next = "/";
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { next?: unknown } | null;
      if (typeof data?.next === "string" && data.next) next = data.next;
    } catch {
      // تعذّر النداء: الوجهة تبقى الجذر، والوسيط يردّه إلى الباب.
    }
    window.location.href = next;
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
