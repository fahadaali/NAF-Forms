// مقارنة نصّين بزمن ثابت — لكلمة مرور النموذج ولرمز الواجهة البرمجية.
//
// المقارنة بـ`===` تخرج عند أول حرف مختلف، فزمنُها يقيس طول البادئة
// المطابقة. وذلك يكفي لاستخراج السرّ حرفًا حرفًا على شبكة هادئة.
//
// والطول نفسه يُخفى: مقارنةٌ تردّ فورًا حين يختلف الطول تكشف طول السرّ.
// فتُجزَّأ القيمتان إلى بصمتين ثابتتَي الطول (SHA-256) وتُقارن البصمتان —
// وهي الحيلة المعتادة حين لا يتوفّر `crypto.timingSafeEqual` (وهو غير
// متاح على Workers).
//
// وتعمل على البيئتين: `crypto.subtle` قياسي في Node 18+ وفي Workers.

const enc = new TextEncoder();

async function digest(value: string): Promise<Uint8Array> {
  const bits = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return new Uint8Array(bits);
}

/** مقارنة غير متزامنة بزمن ثابت — الأدقّ، وتُخفي الطول. */
export async function timingSafeEqualAsync(
  a: string,
  b: string
): Promise<boolean> {
  const [ha, hb] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

/**
 * مقارنة متزامنة بزمن ثابت على طول القيمة المرجعية.
 *
 * لا تُخفي اختلاف الطول (تُقارن الطولين أولًا)، وتُخفي موضع أول اختلاف —
 * وهو ما يُستخرج به السرّ. تكفي حيث لا يصحّ الانتظار غير المتزامن.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  // الطول يُقارن أولًا ثم تُمشى القيمة كاملةً بلا خروج مبكر. وحين يختلف
  // الطول نمشي على `b` كاملةً كذلك حتى لا يفرّق الزمن بين طولٍ خاطئ
  // ومحتوًى خاطئ.
  let diff = a.length === b.length ? 0 : 1;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
