"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { House, ShieldCheck, Users } from "lucide-react";
import {
  AppShell,
  AppMain,
  AppHeader,
  HeaderStart,
  HeaderEnd,
  AppContent,
  Sidebar,
  SidebarHeader,
  SidebarNav,
  ShellBackdrop,
  MenuButton,
  AccountMenu,
  Breadcrumbs,
  Page,
  navLinkClassName,
  useShell,
  type Crumb,
  type PageWidth,
} from "@/naf/ui/app-shell";
import { ThemeToggle } from "@/naf/ui/theme-toggle";
import { NafLogo } from "@/components/ui/naf-logo";

/* الجزء العميل من هيكل الاستبانات.
   الخادم يقرأ الجلسة ويمرّر الهوية؛ وهذا يملك حالة الدرج والقائمة —
   وكلاهما يحتاج المتصفّح. */

type NavItem = { href: string; label: string; icon: ReactNode; adminOnly?: boolean };

const sz = 24; // مقاس التنقّل — naf-icons.md «المقاسات»

const NAV: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: <House size={sz} aria-hidden="true" /> },
  {
    href: "/members",
    label: "الفريق والصلاحيات",
    icon: <ShieldCheck size={sz} aria-hidden="true" />,
    adminOnly: true,
  },
  {
    href: "/users",
    label: "تهيئة مسبقة",
    icon: <Users size={sz} aria-hidden="true" />,
    adminOnly: true,
  },
];

/** يغلق الدرج عند الانتقال — وإلا بقي مفتوحاً فوق الشاشة الجديدة. */
function CloseDrawerOnNavigate() {
  const { setOpen } = useShell();
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);
  return null;
}

function Body({
  crumbs,
  width,
  isAdmin,
  name,
  email,
  children,
}: {
  crumbs: Crumb[];
  width: PageWidth;
  isAdmin: boolean;
  /** يُمرَّر كما هو ولو كان فارغاً — البديل في المكوّن المسجَّل. */
  name?: string | null;
  email?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const visible = NAV.filter((i) => !i.adminOnly || isAdmin);

  // تنقّلٌ كامل بالمتصفح لا router.push.
  //
  // بعد الخروج لا جلسة، فأوّل طلبٍ يردّه الوسيط تحويلةً إلى نطاق المركز.
  // وrouter.push تجلب المسار بـfetch، والمتصفّح لا يتبع تحويلةً إلى أصل
  // آخر بلا CORS — فيسقط الطلب بخطأ شبكة ويبقى المستخدم مكانه وشاشته
  // فارغة. والتنقّل الكامل يتبعها ويصل إلى الباب.
  //
  // والوجهة يقولها الخادم، وهي المركز لا جذر هذه المنصة. كانت `/`: وهو
  // محميّ، فيحوّله الوسيط إلى `/go/NAF-Forms`، وجلسة المركز لم تُمسّ
  // فتُصدر رمزاً جديداً — فيعود الخارجُ إلى شاشته قبل أن يقرأ شيئاً.
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
    <>
      <CloseDrawerOnNavigate />
      <ShellBackdrop />

      {/* كانت هذه المنصة وحدها بلا شريط جانبي: ترويسةٌ فيها فتات المسار
          وحدها، فالأقسام لا تُرى إلا بالرجوع إلى الرئيسية. صار لها الشريط
          نفسه، وبقيت الفتات في الترويسة لأن للنماذج عمقاً يحتاجها. */}
      <Sidebar>
        <SidebarHeader>
          <NafLogo variant="mark" className="h-9 w-9 shrink-0" />
          <div>
            <div className="naf-sidebar-brand-name">استبانات ناف</div>
            <div className="naf-sidebar-brand-sub">منصة النماذج والاستطلاعات</div>
          </div>
        </SidebarHeader>
        <SidebarNav>
          {visible.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={navLinkClassName(active)}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </SidebarNav>
      </Sidebar>

      <AppMain>
        <AppHeader>
          <HeaderStart>
            <MenuButton />
            <Breadcrumbs items={crumbs} />
          </HeaderStart>
          <HeaderEnd>
            {/* الخروج كان زرّاً في الترويسة يختفي نصّه دون sm فيبقى أيقونة
                وحدها. صار بنداً باسمه داخل قائمة الحساب في كل مقاس. */}
            <AccountMenu
              name={name}
              email={email}
              appearance={<ThemeToggle />}
              onLogout={logout}
            />
          </HeaderEnd>
        </AppHeader>

        <AppContent>
          <Page width={width}>{children}</Page>
        </AppContent>
      </AppMain>
    </>
  );
}

export default function ShellChrome({
  crumbs = [],
  width = "default",
  isAdmin,
  name,
  email,
  children,
}: {
  crumbs?: Crumb[];
  width?: PageWidth;
  isAdmin: boolean;
  name?: string | null;
  email?: string;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <Body crumbs={crumbs} width={width} isAdmin={isAdmin} name={name} email={email}>
        {children}
      </Body>
    </AppShell>
  );
}
