import type { ReactNode } from "react";
import { headers } from "next/headers";
import { currentSession, isAdmin } from "@/lib/session";
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

  /* ═══ «هل هو مسؤول؟» جوابٌ واحد لا جوابان ═══

     كان هنا `getUserById(session.uid)?.role === "admin"` — أي الدور من
     جدول `User` **القديم**، بينما `requireAdmin` وحارسُ الوسيط يقرآن دور
     `members`. فمسؤولٌ دخل بالدخول الموحّد ولا سجلّ قديم له بالبريد نفسه
     — وهي الحالة الطبيعية لكل عضو جديد — كان `getUserById` تُرجع له
     `null`، فيختفي بندا «الفريق والصلاحيات» و«المستخدمون» من تنقّله
     بينما تفتح له الشاشتان بكتابة العنوان يدويًا. مسؤولٌ لا يجد شاشته.

     والمصدر الآن `session.role` — وهو ما حقنه الوسيط من `members`، أي ما
     يُحكَم به فعلًا. */
  const admin = isAdmin(session);

  // الاسم من صفّ العضو في المركز، لا من السجلّ المحلي: جدول `User` المحلي
  // يحمل البريد والدرجة ولا يحمل اسماً، فكانت الترويسة تعرض البريد.
  // ومفتاح الصفّ `sub` من الترويسة لا المعرّف المحلي — وهما مختلفان.
  const sub = (await headers()).get(H_SUB) ?? "";
  const identity = sub ? await getMemberIdentity(sub) : { name: null, email: null };

  return (
    <ShellChrome
      crumbs={crumbs}
      width={width}
      isAdmin={admin}
      name={identity.name}
      email={identity.email ?? undefined}
    >
      {children}
    </ShellChrome>
  );
}
