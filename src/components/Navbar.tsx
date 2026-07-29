/* مُستبدَل — لم يعد مستهلَكاً في أي شاشة.
   حلّ محلّه `AppChrome` (الخادم) و`ShellChrome` (العميل)، وهما يبنيان
   هيكل ناف المسجَّل: شريط جانبي وترويسة وقائمة حساب ودرج للجوال.
   أُبقي الملف (قاعدة: لا تُحذف الملفات) ولا يُستأنف استعماله —
   ترويسةٌ ثانية تعني هيكلين في مستودع واحد. */

import Link from "next/link";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
import { currentSession } from "@/lib/session";
import { getUserById } from "@/lib/repo";
import { Icon } from "@/components/ui/Icon";
import { NafLogo } from "@/components/ui/naf-logo";

export default async function Navbar({
  crumbs = [],
}: {
  crumbs?: { label: string; href?: string }[];
}) {
  const session = await currentSession();
  const me = session ? await getUserById(session.uid) : null;

  return (
    <header className="glass sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
        {/* min-w-0 على الحاضن وtruncate على كل فتاتة: مسار طويل يُقصَّر
            بدل أن يدفع الشريط فيتجاوز عرض الشاشة (فحص ٣٧٥ بكسل). */}
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 font-bold">
            <NafLogo variant="mark" className="h-9 w-9" />
            <span className="gradient-text text-base">استبانات ناف</span>
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="opacity-50">/</span>
              {c.href ? (
                <Link
                  href={c.href}
                  className="truncate text-muted-foreground hover:text-primary"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="truncate text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {me?.role === "admin" && (
            <Link
              href="/users"
              aria-label="المستخدمون"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Icon name="users" className="h-4 w-4" />
              <span className="hidden sm:inline">المستخدمون</span>
            </Link>
          )}
          {me && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              <bdi>{me.email}</bdi>
            </span>
          )}
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
