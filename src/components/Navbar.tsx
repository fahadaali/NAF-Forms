import Link from "next/link";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
import { currentSession } from "@/lib/session";
import { getUserById } from "@/lib/repo";

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
          <Link href="/" className="flex items-center gap-2.5 font-extrabold">
            <img
              src="/naf-logo.jpg"
              alt="ناف"
              className="h-9 w-9 rounded-xl object-cover ring-1 ring-brand-taupe/40"
            />
            <span className="gradient-text text-base">استبانات ناف</span>
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 text-slate-400">
              <span className="opacity-50">/</span>
              {c.href ? (
                <Link href={c.href} className="text-slate-600 hover:text-naf-600">
                  {c.label}
                </Link>
              ) : (
                <span className="text-slate-700">{c.label}</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {me?.role === "admin" && (
            <Link
              href="/users"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              👥 المستخدمون
            </Link>
          )}
          {me && (
            <span className="hidden text-xs text-slate-400 sm:inline" dir="ltr">
              {me.email}
            </span>
          )}
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
