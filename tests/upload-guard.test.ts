import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnUploadUrl, sanitizeFileAnswer } from "../src/lib/utils";

// إجابة حقل الملف كانت تُخزَّن كما وصلت، فمن أرسل الطلب مباشرةً كتب
// `{name:"السيرة الذاتية.pdf", url:"https://…"}` لأي عنوان شاء — فتعرضه
// لوحة الردود رابطاً يفتحه المشرف على أنه مرفق المتقدّم.
const R2 = "https://pub-abc123.r2.dev";

test("يقبل مسار تخزيننا النسبي", () => {
  assert.equal(isOwnUploadUrl("/uploads/abc123-cv.pdf"), true);
});

test("يقبل الرابط العام حين يُضبط، ولا يقبله بدونه", () => {
  assert.equal(isOwnUploadUrl(`${R2}/abc-cv.pdf`, R2), true);
  assert.equal(isOwnUploadUrl(`${R2}/abc-cv.pdf`), false, "بلا قاعدة معروفة لا يُقبل مطلق");
});

test("يردّ العناوين الخارجية", () => {
  for (const u of [
    "https://evil.example/cv.pdf",
    "//evil.example/cv.pdf",
    "javascript:alert(1)",
    "data:text/html,<script>",
    "",
    null,
    undefined,
  ])
    assert.equal(isOwnUploadUrl(u as any, R2), false, String(u));
});

test("يردّ محاولة الالتفاف بقاعدة مشابهة أو صعود مسار", () => {
  assert.equal(isOwnUploadUrl(`${R2}.evil.com/x.pdf`, R2), false, "قاعدة مشابهة");
  assert.equal(isOwnUploadUrl("/uploads/../../etc/passwd"), false, "صعود مسار");
  assert.equal(isOwnUploadUrl(`${R2}/../x`, R2), false);
});

test("التنقية تُبقي المقبول وتُسقط الدخيل", () => {
  const good = { name: "cv.pdf", url: "/uploads/a-cv.pdf", size: 10 };
  const evil = { name: "cv.pdf", url: "https://evil.example/x.pdf" };

  assert.deepEqual(sanitizeFileAnswer(good), { name: "cv.pdf", url: "/uploads/a-cv.pdf", size: 10 });
  assert.equal(sanitizeFileAnswer(evil), null);
  assert.deepEqual(sanitizeFileAnswer([good, evil]).map((f: any) => f.url), ["/uploads/a-cv.pdf"]);
});

test("التنقية تقصّ الاسم ولا تحمل حقولاً زائدة", () => {
  const r: any = sanitizeFileAnswer({
    name: "x".repeat(400),
    url: "/uploads/a.pdf",
    size: "ليس رقماً",
    onerror: "alert(1)",       // حقل مدسوس
  });
  assert.equal(r.name.length, 300);
  assert.equal(r.size, 0);
  assert.deepEqual(Object.keys(r).sort(), ["name", "size", "url"]);
});

test("قيمة ليست كائناً تسقط", () => {
  assert.equal(sanitizeFileAnswer("/uploads/a.pdf"), null);
  assert.equal(sanitizeFileAnswer(null), null);
});
