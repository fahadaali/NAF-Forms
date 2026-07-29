import type { ReactNode } from "react";
import { headers } from "next/headers";
import { currentSession } from "@/lib/session";
import { getUserById } from "@/lib/repo";
import { getMemberIdentity } from "@/lib/members";
import { H_SUB } from "@/lib/sso";
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

  // الاسم من صفّ العضو في المركز، لا من السجلّ المحلي: جدول `User` المحلي
  // يحمل البريد والدرجة ولا يحمل اسماً، فكانت الترويسة تعرض البريد.
  // ومفتاح الصفّ `sub` من الترويسة لا المعرّف المحلي — وهما مختلفان.
  const sub = (await headers()).get(H_SUB) ?? "";
  const identity = sub ? await getMemberIdentity(sub) : { name: null, email: null };

  return (
    <ShellChrome
      crumbs={crumbs}
      width={width}
      isAdmin={me?.role === "admin"}
      name={identity.name}
      email={me?.email ?? identity.email ?? undefined}
    >
      {children}
    </ShellChrome>
  );
}
