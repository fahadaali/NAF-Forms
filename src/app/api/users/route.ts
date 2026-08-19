import { NextResponse } from "next/server";
import { listUsers, getUserByEmail, createUser } from "@/lib/repo";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

/* ═══ هذه الشاشة تهيئة مسبقة، لا إدارة حسابات ═══

   المصادقة كلها في المركز منذ الدخول الموحّد، ولا يُنشأ حساب من هنا ولا
   يُدخَل به. ووظيفة الصفّ المُنشأ هنا واحدة: أن يجده `linkExistingUser`
   في `lib/sso.ts` عند **أول دخول موحّد** لصاحب البريد نفسه، فيربطه
   بهويته المركزية ويعطيه الصلاحية المكتوبة هنا بدل الصلاحية الافتراضية.

   وما بعد ذلك تُدار الصلاحية من «الفريق والصلاحيات» على جدول `members`،
   وهو ما يقرؤه الوسيط في كل طلب. */

// قائمة المستخدمين (مسؤول فقط)
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  const users = await listUsers();
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
    }))
  );
}

// إضافة مستخدم بكلمة المرور الافتراضية 1234 (مسؤول فقط)
export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });
  const { email, role } = await req.json();
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
    return NextResponse.json({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }, { status: 400 });
  const exists = await getUserByEmail(clean);
  if (exists)
    return NextResponse.json({ error: "البريد مستخدم مسبقًا" }, { status: 409 });

  /* كلمة مرور عشوائية لا `1234`.
     الصفّ لا يُدخَل به — باب كلمة المرور مغلق (`/api/login` يردّ ٤١٠) —
     لكن العمود `NOT NULL` فلا بدّ من قيمة. وقيمةٌ معلومة في كل صفّ تعني
     أن أيّ إعادة فتحٍ للباب يومًا تفتح كل هذه الحسابات بكلمة واحدة.
     فتُكتب قيمة لا يعرفها أحد ولا تُعرض. */
  const user = await createUser({
    email: clean,
    role: role === "admin" ? "admin" : "member",
    passwordHash: await hashPassword(crypto.randomUUID()),
    mustChangePassword: false,
  });
  return NextResponse.json({ id: user.id, email: user.email, role: user.role });
}
