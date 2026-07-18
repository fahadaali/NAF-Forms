import Link from "next/link";

export default function Navbar({ crumbs = [] }: { crumbs?: { label: string; href?: string }[] }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-naf-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-naf-600 text-white">
              ن
            </span>
            استبانات ناف
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 text-slate-400">
              <span>/</span>
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
      </div>
    </header>
  );
}
