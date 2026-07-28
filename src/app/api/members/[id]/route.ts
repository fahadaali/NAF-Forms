import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { reportAccessChange } from "naf-auth";
import { requireAdmin } from "@/lib/session";
import { ssoConfig } from "@/lib/sso";
import {
  countActiveAdmins,
  getMemberEmail,
  setMemberActive,
  setMemberRole,
} from "@/lib/members";
import { isRole } from "@/lib/roles";

// تغيير الصلاحية أو سحب الوصول — للمسؤول وحده.
// الوسيط يحمي `/api/members` سلفاً، والفحص هنا ثانٍ لا بديل: مسار قد يُستدعى
// يوماً من سياق آخر، والاعتماد على طبقة واحدة يجعل ثغرةً في الوسيط ثغرةً هنا.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "هذه العملية تتطلب صلاحية مسؤول" },
      { status: 403 }
    );

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

  // سحب الوصول أو منحه
  if (typeof body.isActive === "boolean") {
    if (!body.isActive && (await countActiveAdmins()) <= 1)
      return NextResponse.json(
        { error: "لا بد من مسؤول واحد على الأقل" },
        { status: 409 }
      );

    /* البريد يُقرأ **قبل** الكتابة: المركز يطابق صفّ الوصول بالبريد لا
       بالمعرّف المركزي، فتمريرُ `user_id` إليه يردّ عليه `invalid_body`.
       وهذا هو الخطأ التاسع في تقرير NAF-Accountant: مثال الوثيقة كان على
       توقيع محذوف، والتوقيع القائم `{ email, state }`. */
    const email = await getMemberEmail(id);

    await setMemberActive(id, body.isActive);

    /* التبليغ العكسي: يوافق جدولُ الوصول في المركز ما تراه المنصة، وإلا
       بقيت بطاقتها تدعو المستخدم إلى باب لا يفتح.

       والسحب نافذ محلياً فور كتابته — الوسيط يقرأ حالة العضو في كل طلب —
       فتعذّر التبليغ لا يُلغيه. ولذلك يُقال للمسؤول ما تمّ وما لم يتمّ،
       ولا يُقال «فشل السحب» فيعيد فعلاً نُفِّذ أصلاً.

       والمنح يُبلَّغ كما يُبلَّغ السحب: صفّ الوصول في المركز كتبته هذه
       المنصة عند السحب، فبلا تبليغ المنح يبقى الصفّ `revoked` ولا يعود
       العضو يدخل مهما مُنح محلياً. و`/api/internal/access` يقبل الحالتين
       ويشتقّ المنصة من سرّها، فلا تبلّغ منصةٌ عن غيرها. */
    let reported = true;
    if (email) {
      try {
        const { env } = await getCloudflareContext({ async: true });
        await reportAccessChange(env, ssoConfig(env), {
          email,
          state: body.isActive ? "granted" : "revoked",
        });
      } catch {
        reported = false;
      }
    } else {
      // عضو بلا بريد لا يُطابقه المركز أصلاً، فلا يُدَّعى أنه بُلِّغ.
      reported = false;
    }

    return NextResponse.json({
      ok: true,
      reported,
      message: body.isActive ? "تم المنح" : "تم السحب",
    });
  }

  return NextResponse.json({ error: "هذا الحقل مطلوب" }, { status: 400 });
}
