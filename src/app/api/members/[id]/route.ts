import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { reportAccessChange } from "naf-auth";
import { requireAdmin } from "@/lib/session";
import { ssoConfig } from "@/lib/sso";
import {
  countActiveAdmins,
  getMemberEmail,
  getMemberRole,
  isActiveAdmin,
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

    /* ═══ الحارس ينظر إلى **المستهدَف**، لا إلى العدد وحده ═══

       كان الشرط `body.role !== "admin" && countActiveAdmins() <= 1` — بلا
       نظرٍ إلى من يُعدَّل. وبمسؤولٍ واحد — وهي الحالة الغالبة، والدور
       الافتراضي `viewer` لا `admin` — كان تخفيضُ **أي** محرّر يُردّ بـ٤٠٩
       «لا بد من مسؤول واحد على الأقل»، وهي رسالة لا علاقة لها بالسبب.

       فالمنع مشروط باثنين معًا: أن يكون المستهدَف مسؤولًا نشطًا، وأن يكون
       الوحيد. وما دونهما تخفيضٌ لا يمسّ المسؤولين فيمرّ. */
    if (
      body.role !== "admin" &&
      (await isActiveAdmin(id)) &&
      (await countActiveAdmins()) <= 1
    )
      return NextResponse.json(
        { error: "لا بد من مسؤول واحد على الأقل" },
        { status: 409 }
      );

    await setMemberRole(id, body.role);

    /* تبليغ المركز بالصلاحية — عرضاً لا حكماً.

       مسؤول النظام يمنح وصولاً إلى هذه المنصة ولا تقول له أي شاشة ماذا صار
       يرى الممنوح. فيُبلَّغ بما قُرّر هنا ليعرضه في صفّ الوصول، والقرار يبقى
       هنا: المركز لا يقرأ هذه القيمة في أي قرار دخول.

       وبلا `state`: المنح لم يتغيّر، وكتابته مع كل ترقية تمحو سحباً صادراً
       من المركز.

       والفشل لا يُرفع إلى المسؤول: الترقية نافذة محلياً فور كتابتها —
       الوسيط يقرأ الدور في كل طلب — والناقص عرضُها في اللوحة. */
    const roleEmail = await getMemberEmail(id);
    if (roleEmail) {
      try {
        const { env } = await getCloudflareContext({ async: true });
        await reportAccessChange(env, ssoConfig(env), { email: roleEmail, role: body.role });
      } catch {
        /* عرضٌ متأخّر في المركز، والصلاحية نافذة هنا */
      }
    }

    return NextResponse.json({ ok: true, message: "تم تحديث الصلاحية" });
  }

  // سحب الوصول أو منحه
  if (typeof body.isActive === "boolean") {
    // وسحب الوصول مثله: كان يُردّ عن كل عضو ما دام المسؤول واحدًا، فزرّ
    // «سحب» في شاشة الصلاحيات لا يعمل على أحد. والمنع للمسؤول الأخير وحده.
    if (
      !body.isActive &&
      (await isActiveAdmin(id)) &&
      (await countActiveAdmins()) <= 1
    )
      return NextResponse.json(
        { error: "لا بد من مسؤول واحد على الأقل" },
        { status: 409 }
      );

    /* البريد يُقرأ **قبل** الكتابة: المركز يطابق صفّ الوصول بالبريد لا
       بالمعرّف المركزي، فتمريرُ `user_id` إليه يردّ عليه `invalid_body`.
       وهذا هو الخطأ التاسع في تقرير NAF-Accountant: مثال الوثيقة كان على
       توقيع محذوف، والتوقيع القائم `{ email, state }`. */
    const email = await getMemberEmail(id);
    // والصلاحية معه: تُعرض في المركز مع الحالة، ولا تُقرأ في قرار دخول.
    const role = await getMemberRole(id);

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
          // السحب لا يمحو الصلاحية المعروضة في المركز — يُبقيها `COALESCE`
          // هناك — فيبقى المسؤول يرى ما كان يملكه المسحوب.
          ...(role ? { role } : {}),
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
