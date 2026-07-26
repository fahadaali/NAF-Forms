import Link from "next/link";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
import { currentSession } from "@/lib/session";
import { getUserById } from "@/lib/repo";
import { Icon } from "@/components/ui/Icon";

export default async function Navbar({
  crumbs = [],
}: {
  crumbs?: { label: string; href?: string }[];
}) {
  const session = await currentSession();
  const me = session ? await getUserById(session.uid) : null;

  return (
    <header className="glass sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <img
              src="/naf-logo.jpg"
              alt="ناف"
              className="h-9 w-9 rounded-xl object-cover ring-1 ring-border"
            />
            <span className="gradient-text text-base">استبانات ناف</span>
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 text-muted-foreground">
              <span className="opacity-50">/</span>
              {c.href ? (
                <Link href={c.href} className="text-muted-foreground hover:text-primary">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {me?.role === "admin" && (
            <Link
              href="/users"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Icon name="users" className="h-4 w-4" /> المستخدمون
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
