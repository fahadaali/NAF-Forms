"use client";

// نداءات اللوحة إلى مسارات هذه المنصة المحمية.
//
// **لماذا هذا الملف موجود.** الرمز الذي تقوم عليه الجلسة يعيش خمس عشرة
// دقيقة، فانتهاؤه ليس حدثاً نادراً: لوحةٌ مفتوحة أطول من ذلك تبلغه في كل
// مرة. والوسيط منذ `naf-auth@v3.0.0` يفرّق بين تصفّحٍ ونداءٍ برمجي بطبيعة
// الطلب، فيردّ على `fetch`:
//
//   ٤٠١ + { login }            لا جلسة — أعد المستخدم إلى باب المركز
//   ٤٠٣ + { reason, denied }   ممنوع — أعده إلى صفحة الرفض
//
// وبلا معالجة الفرعين: انتهاء الرمز يعطي خطأ شبكة مبهماً عند `res.json()`،
// وسحبُ الوصول يعطي **شاشة خاوية بلا سبب**. والثانية أسوأ، لأنها تقع في
// أوّل طلب تالٍ لعضوٍ سُحب وصولُه ولوحتُه مفتوحة.
//
// ولا يُستعمل هذا الغلاف على المسارات العامة — تعبئة النموذج تحت `/f/`
// و`/api/f/` و`/api/upload` و`/api/logout` — فليس لها جلسة تنتهي أصلاً.

/**
 * الوجهة بعد الدخول تُصحَّح من موضع المتصفّح.
 *
 * الوسيط يبني `next` من مسار الطلب، ومسارُ نداءٍ برمجي ليس صفحةً يُعاد
 * إليها: العودة إليه بعد الدخول تعرض على المستخدم ردّ `JSON` خاماً.
 * والمتصفّح وحده يعرف موضعه الحقيقي.
 *
 * ومسار الرفض يُستثنى صراحةً وإلا دارت الحلقة: يعود من المركز إلى
 * `/denied`، فيُردّ ثانيةً، فيعود… ولا تُقرأ الرسالة أصلاً.
 */
export function withCurrentNext(login: string): string {
  try {
    const url = new URL(login, window.location.origin);
    if (window.location.pathname === "/denied") url.searchParams.delete("next");
    else
      url.searchParams.set(
        "next",
        window.location.pathname + window.location.search
      );
    return url.toString();
  } catch {
    return login;
  }
}

/** ٤٠١ ومعه عنوان الباب: تنقّلٌ كامل إلى المركز. */
export function handleUnauthorized(res: Response, data: unknown): boolean {
  if (res.status !== 401) return false;
  const login = (data as { login?: unknown } | null)?.login;
  if (typeof login !== "string" || !login) return false;
  window.location.href = withCurrentNext(login);
  return true;
}

/**
 * ٤٠٣ ومعه مسار الرفض: تحويلة داخلية يتولّاها المتصفّح لا `fetch`.
 *
 * ولا يشمل هذا ٤٠٣ التخويل المحلي — «هذه العملية تتطلب صلاحية مسؤول» —
 * فتلك لا تحمل `denied` وتُعرض في مكانها ولا يُنقل المستخدم عنها.
 */
export function handleDenied(res: Response, data: unknown): boolean {
  if (res.status !== 403) return false;
  const denied = (data as { denied?: unknown } | null)?.denied;
  if (typeof denied !== "string" || !denied) return false;
  window.location.href = denied;
  return true;
}

/**
 * غلاف `fetch` للمسارات المحمية. توقيعه توقيع `fetch` نفسه، فلا يتغيّر
 * أي مستدعٍ إلا في الاسم.
 *
 * الجسم يُقرأ من نسخة لا من الأصل، فيبقى الأصل قابلاً للقراءة عند
 * المستدعي حين لا يقع تحويل.
 *
 * وحين يقع التحويل يعيد وعداً لا يُحلّ أبداً: الصفحة في طريقها إلى
 * مكان آخر، فإكمالُ الدالة يعرض خطأً لا معنى له في لحظة الانتقال.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401 && res.status !== 403) return res;

  const data = await res.clone().json().catch(() => null);
  if (handleUnauthorized(res, data) || handleDenied(res, data)) {
    return new Promise<Response>(() => {});
  }
  return res;
}
