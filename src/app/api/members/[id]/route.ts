import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { reportAccessChange } from "naf-auth";
import { requireAdmin } from "@/lib/session";
import { ssoConfig } from "@/lib/sso";
import { countActiveAdmins, setMemberActive, setMemberRole } from "@/lib/members";
import { isRole } from "@/lib/roles";

// تغيير الصلاحية أو تعطيل العضو — للمسؤول وحده.
// الوسيط يحمي `/api/members` سلفاً، والفحص هنا ثانٍ لا بديل: مسار قد يُستدعى
// يوماً من سياق آخر، والاعتماد على طبقة واحدة يجعل ثغرةً في الوسيط ثغرةً هنا.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "لا تملك صلاحية الوصول" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { role?: unknown; isActive?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "هذا الحقل مطلوب" }, { status: 400 });

  // تغيير الصلاحية
  if (body.role !== undefined) {
    if (!isRole(body.role))
      return NextResponse.json({ error: "هذا الحقل مطلوب" }, { status: 400 });

    // آخر مسؤول نشط لا تُنزع صلاحيته، وإلا أُغلقت الشاشة على الجميع
    // ولم يبقَ من يعيد فتحها من داخل المنصة.
    if (body.role !== "admin" && (await countActiveAdmins()) <= 1)
      return NextResponse.json(
        { error: "لا بد من مسؤول واحد على الأقل" },
        { status: 409 }
      );

    await setMemberRole(id, body.role);
    return NextResponse.json({ ok: true, message: "تم تحديث الصلاحية" });
  }

  // تعطيل العضو أو تفعيله
  if (typeof body.isActive === "boolean") {
    if (!body.isActive && (await countActiveAdmins()) <= 1)
      return NextResponse.json(
        { error: "لا بد من مسؤول واحد على الأقل" },
        { status: 409 }
      );

    await setMemberActive(id, body.isActive);

    // تبليغ المركز (§٣-٦): يظهر أثر التعطيل في شبكة المنصات عند المستخدم.
    // القاعدة المحلية حُدِّثت سلفاً، فتعذّر التبليغ لا يُلغيها — يُبلَّغ
    // المسؤول أن المركز لم يصله الخبر، ولا يُكشف تفصيل تقني.
    let reported = true;
    try {
      const { env } = await getCloudflareContext({ async: true });
      await reportAccessChange(env, ssoConfig(env), {
        userId: id,
        status: body.isActive ? "active" : "disabled",
      });
    } catch {
      reported = false;
    }

    return NextResponse.json({
      ok: true,
      reported,
      message: body.isActive ? "تم تفعيل المستخدم" : "تم تعطيل المستخدم",
    });
  }

  return NextResponse.json({ error: "هذا الحقل مطلوب" }, { status: 400 });
}
