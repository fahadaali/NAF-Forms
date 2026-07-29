import type { ReactNode } from "react";
import { currentSession } from "@/lib/session";
import { getUserById } from "@/lib/repo";
import ShellChrome from "./ShellChrome";
import type { Crumb, PageWidth } from "@/naf/ui/app-shell";

/* هيكل الاستبانات — الجزء الخادم.
   يقرأ الجلسة مرّة واحدة ويمرّر الهوية إلى الجزء العميل. يحلّ محلّ
   `Navbar` وحاضنِ المحتوى معاً في كل شاشة. */

export default async function AppChrome({
  crumbs = [],
  width = "default",
  children,
}: {
  crumbs?: Crumb[];
  width?: PageWidth;
  children: ReactNode;
}) {
  const session = await currentSession();
  const me = session ? await getUserById(session.uid) : null;

  return (
    <ShellChrome
      crumbs={crumbs}
      width={width}
      isAdmin={me?.role === "admin"}
      name={me?.email ?? "مستخدم"}
      email={me?.email}
    >
      {children}
    </ShellChrome>
  );
}
