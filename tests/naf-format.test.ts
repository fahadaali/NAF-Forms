import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatTime, formatDateTime, formatMonth, formatNumber, formatAmount, formatPhone, isolate } from "../src/lib/naf-format";

/* المرجع توقيت الرياض لا منطقة البيئة.
 *
 * هذا الملف يُشغَّل تحت `TZ` معادية (انظر سكربت `test`): على Workers منطقة
 * الخادم UTC، وفي المتصفّح منطقة القارئ — وكان ذلك يعطي ثلاثة أجوبة لسؤال
 * واحد، وثلاث ساعات تنقل ردّاً من ليلة إلى ليلة.
 */

test("الرياض تسبق UTC بثلاث ساعات — والتاريخ ينقلب معها", () => {
  // 21:30 بتوقيت UTC = 00:30 من اليوم التالي بتوقيت الرياض
  const d = new Date("2026-08-19T21:30:00Z");
  assert.equal(formatDate(d), "2026/08/20");
  assert.equal(formatTime(d), "00:30");
  assert.equal(formatDateTime(d), "2026/08/20 00:30");
});

test("منتصف الليل بالضبط يُكتب 00:00 لا 24:00", () => {
  // بعض المحرّكات تُخرج "24" مع hour12:false
  const d = new Date("2026-08-19T21:00:00Z"); // = 00:00 بالرياض
  assert.equal(formatTime(d), "00:00");
  assert.equal(formatDate(d), "2026/08/20");
});

test("منتصف النهار وآخر دقيقة", () => {
  assert.equal(formatTime(new Date("2026-08-19T09:00:00Z")), "12:00");
  assert.equal(formatTime(new Date("2026-08-19T20:59:00Z")), "23:59");
});

test("لا صيف ولا شتاء: الإزاحة ثابتة على مدار السنة", () => {
  // نفس الساعة UTC في يناير ويوليو تعطي نفس ساعة الرياض
  assert.equal(formatTime(new Date("2026-01-15T12:00:00Z")), "15:00");
  assert.equal(formatTime(new Date("2026-07-15T12:00:00Z")), "15:00");
});

test("يقبل النصّ والرقم كما يقبل Date", () => {
  const iso = "2026-08-19T21:30:00Z";
  assert.equal(formatDate(iso), "2026/08/20");
  assert.equal(formatDate(new Date(iso).getTime()), "2026/08/20");
});

test("الشهر مشتقّ من الصيغة نفسها", () => {
  assert.equal(formatMonth(new Date("2026-08-19T21:30:00Z")), "2026/08");
});

test("الأرقام غربية بفاصل آلاف، والمبالغ بخانتين", () => {
  assert.equal(formatNumber(12400), "12,400");
  assert.equal(formatAmount(12400), "12,400.00");
  assert.equal(formatAmount(0.5), "0.50");
});

test("الجوال السعودي بصيغته الموحّدة", () => {
  assert.equal(formatPhone("0512345678"), "+966 51 234 5678");
  assert.equal(formatPhone("966512345678"), "+966 51 234 5678");
  assert.equal(formatPhone("12"), "12", "ما لا يطابق يبقى كما هو");
});

test("العزل الاتجاهي يلفّ القيمة بمحرفَي FSI وPDI", () => {
  assert.equal(isolate(42), "⁨42⁩");
});
