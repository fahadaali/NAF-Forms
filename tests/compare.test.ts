import { test } from "node:test";
import assert from "node:assert/strict";
import { timingSafeEqual, timingSafeEqualAsync } from "../src/lib/compare";

// المقارنة تحرس كلمة مرور النموذج ورمز الواجهة البرمجية.
// الاختبار هنا للصحّة لا للزمن: مقارنةٌ آمنة زمنياً وخاطئة منطقياً أسوأ.

test("متطابقان", () => {
  assert.equal(timingSafeEqual("s3cret", "s3cret"), true);
  assert.equal(timingSafeEqual("", ""), true);
});

test("مختلفان", () => {
  assert.equal(timingSafeEqual("s3cret", "s3crea"), false);
  assert.equal(timingSafeEqual("s3cret", "S3cret"), false, "حسّاسة لحالة الأحرف");
});

test("طولان مختلفان — ومنهما البادئة المطابقة", () => {
  assert.equal(timingSafeEqual("abc", "abcd"), false);
  assert.equal(timingSafeEqual("abcd", "abc"), false);
  assert.equal(timingSafeEqual("", "a"), false);
  assert.equal(timingSafeEqual("a", ""), false);
});

test("محارف خارج ASCII", () => {
  assert.equal(timingSafeEqual("كلمة", "كلمة"), true);
  assert.equal(timingSafeEqual("كلمة", "كلمه"), false);
});

test("النسخة غير المتزامنة تطابقها", async () => {
  assert.equal(await timingSafeEqualAsync("s3cret", "s3cret"), true);
  assert.equal(await timingSafeEqualAsync("s3cret", "s3crea"), false);
  assert.equal(await timingSafeEqualAsync("abc", "abcd"), false);
  assert.equal(await timingSafeEqualAsync("", ""), true);
});
