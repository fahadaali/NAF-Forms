import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { authenticate, wantsDocument } from "naf-auth";
import { ssoConfig, H_SUB, H_ROLE, H_PERMS } from "@/lib/sso";

// الدخول الموحّد: القرار كلّه في `naf-auth` — التحويل إلى المركز، والحالة
// العابرة، والتحقق من الرمز، وقراءة العضو. وهذا الملف يصل نتيجتها بـ Next.
//
// لماذا هنا لا في `functions/_middleware.js`: هذه المنصة Next.js على Workers
// عبر OpenNext، ولا يُنفَّذ فيها اصطلاح Pages Functions. والحزمة تصدّر
// `authenticate` محايدة الإطار لهذا الغرض، فلا يُنسخ منها شيء.

/** ترويسات الهوية تُمسح من الطلب الوارد قبل حقنها — وإلا انتحلها المتصفح. */
function cleanHeaders(req: NextRequest): Headers {
  const h = new Headers(req.headers);
  h.delete(H_SUB);
  h.delete(H_ROLE);
  h.delete(H_PERMS);
  return h;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { env } = await getCloudflareContext({ async: true });
  const config = ssoConfig(env);

  const result = await authenticate(req, env, config);

  /* استجابة جاهزة من الحزمة: تحويل إلى المركز، أو إلى صفحة الرفض، أو ٤٠١
     أو ٤٠٣ بجسم يُقرأ. تُمرَّر كما هي ولا يُعاد بناؤها.

     كان هنا فرعٌ يردّ ٤٠١ عارياً على كل ما تحت `/api/`، وهو الخطأ الثامن
     في تقرير NAF-Accountant: التفريق ببادئة المسار لا بطبيعة الطلب.
     فتنقّلُ المستخدم إلى رابط تصدير تحت `/api/` — وهي روابط قائمة في هذه
     المنصة: `‎/api/forms/:id/export` و `‎/uploads/:key` — كان يعطيه `JSON`
     خاماً مكان أن يعيده إلى الدخول. والردّ العاري كان يسقط الفرع الآخر
     كذلك: بلا `login` لا تعرف اللوحة أين تعيد المستخدم، وبلا `denied`
     ولا ٤٠٣ يقرأ العضو المسحوب شاشةً خاوية بلا سبب.

     و`v3.0.0` يحكم بـ`Sec-Fetch-Mode` ثم `Accept` ثم البادئة آخراً. */
  if (result.response) {
    return new NextResponse(result.response.body, {
      status: result.response.status,
      headers: result.response.headers,
    });
  }

  // مسار عام: يمرّ بلا هوية، ومع ذلك تُمسح الترويسات المنتحَلة.
  if (!result.user) {
    return NextResponse.next({ request: { headers: cleanHeaders(req) } });
  }

  /* ═══ القارئ يقرأ ولا يكتب ═══

     المنصة كانت تعرض ثلاثة أدوار وتنفّذ اثنين: `requireAdmin` يفصل المسؤول
     عن غيره، ولا فحص واحد يفرّق `editor` من `viewer`. فمن حمل «مستخدم
     (اطّلاع)» كان ينشئ النماذج ويحرّرها ويحذف الردود — والاسم يقول غير
     ذلك، ومسؤول المنصة يسنِده ظانّاً أنه يمنع الكتابة.

     **والحكم بالطريقة لا بقائمة المسارات.** قائمةٌ تُعدَّد فيها المسارات
     الكاتبة تنسى واحداً أوّل ما يُضاف مسار، ونسيانها ثغرة صامتة. والطريقة
     تشمل ما لم يُكتب بعد.

     ويقع **بعد** فرع `!result.user`، فلا يمسّ المسارات العامة: تعبئة
     النموذج ورفع مرفقه وإرساله كلها `POST` يفتحها من لا حساب له أصلاً،
     وحملُها على هذا الحارس يكسر جوهر المنتج.

     والخروج في `PUBLIC_EXACT` كذلك، فيخرج القارئ كما يخرج غيره. */
  if (result.user.role === "viewer" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!wantsDocument(req, new URL(req.url), config))
      return NextResponse.json(
        // §١٠ · رسائل الصلاحية — «تحرير» لا «مسؤول»: ما رُدّ عنه القارئ
        // يفعله المحرّر، فقولُ «مسؤول» يدفعه إلى طلب ترقيةٍ لا يحتاجها.
        { ok: false, error: "forbidden", message: "هذه العملية تتطلب صلاحية تحرير" },
        { status: 403 },
      );
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  /* إعدادات الصلاحيات للمسؤول وحده — تخويلٌ محلي بعد الباب، لا مصادقة.
     وشكل الردّ يتبع طبيعة الطلب هنا كما يتبعها في الحزمة: تنقّلٌ يعرض
     صفحة يُحوَّل، ونداءُ `fetch` يأخذ ٤٠٣ بجسم يُقرأ. */
  if (
    pathname.startsWith("/members") ||
    pathname.startsWith("/api/members") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/api/users")
  ) {
    if (result.user.role !== "admin") {
      if (!wantsDocument(req, new URL(req.url), config))
        return NextResponse.json(
          { ok: false, error: "forbidden", message: "هذه العملية تتطلب صلاحية مسؤول" },
          { status: 403 },
        );
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  const headers = cleanHeaders(req);
  headers.set(H_SUB, result.user.id);
  headers.set(H_ROLE, result.user.role);
  if (result.user.perms) headers.set(H_PERMS, JSON.stringify(result.user.perms));

  return NextResponse.next({ request: { headers } });
}

/* ═══ المستثنى أصولٌ مسمّاة، لا «كل ما فيه نقطة» ═══

   كان الاستثناء `.*\..*` — أي مسار يحوي نقطة يتخطّى الوسيط. وذلك يتخطّى
   شيئين لا شيئاً واحداً: الحماية، **ومسحَ ترويسات الهوية**. فطلبٌ إلى
   مسارٍ فيه نقطة يصل معالجَه حاملاً `x-naf-sub` و `x-naf-role` كما كتبهما
   المتصفّح، و`currentSession` تقرؤهما على أنهما من الوسيط.

   لا يُستغلّ اليوم — كل مسار فيه نقطة يقع على معرّف لا سجلّ له فيردّ
   فارغاً — لكنه انتحالُ هوية ينتظر أول مسار يُضاف تحت قطعة متغيّرة. وهو
   من صنف الخطأ السادس: لا علامة له حتى يقع.

   فالمستثنى الآن مسمّى: أصول Next المبنية، وأيقونات المتصفّح، وما يُخدَم
   من `public/`. وما عداه يمرّ بالوسيط، ويُمسح منه ما انتُحل. */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|brand/|naf-logo\\.jpg).*)",
  ],
};
