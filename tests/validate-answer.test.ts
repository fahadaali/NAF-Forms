import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAnswer } from "../src/lib/utils";

// التحقق على الخادم. كان يفحص أربعة أنواع، فمن أرسل الطلب مباشرةً كتب في
// «القائمة المنسدلة» ما شاء وتجاوز حدود المقياس.
const ok = (t: string, c: any, v: any, req = false) =>
  assert.equal(validateAnswer(t, c, v, req), null, `${t}: ${JSON.stringify(v)}`);
const bad = (t: string, c: any, v: any, req = false) =>
  assert.notEqual(validateAnswer(t, c, v, req), null, `${t}: ${JSON.stringify(v)}`);

test("الإلزامي والاختياري", () => {
  bad("SHORT_TEXT", {}, "", true);
  bad("SHORT_TEXT", {}, undefined, true);
  ok("SHORT_TEXT", {}, "", false);
  ok("SHORT_TEXT", {}, undefined, false);
});

test("الخيارات تُقيَّد بقائمتها", () => {
  const cfg = { options: ["أ", "ب"] };
  ok("MULTIPLE_CHOICE", cfg, "أ");
  bad("MULTIPLE_CHOICE", cfg, "ج");
  ok("DROPDOWN", cfg, "ب");
  bad("DROPDOWN", cfg, "قيمة ملفّقة");
});

test("«خيار آخر» يُقبل نصّاً حرّاً حين يُفعَّل وحده", () => {
  assert.equal(validateAnswer("MULTIPLE_CHOICE", { options: ["أ"], allowOther: true }, "ج", false), null);
  assert.notEqual(validateAnswer("MULTIPLE_CHOICE", { options: ["أ"], allowOther: false }, "ج", false), null);
});

test("مربعات الاختيار: كل عنصر يُفحص، والاختيار الواحد لا يقبل قائمة", () => {
  const cfg = { options: ["أ", "ب", "ج"] };
  ok("CHECKBOXES", cfg, ["أ", "ج"]);
  bad("CHECKBOXES", cfg, ["أ", "دخيل"]);
  bad("MULTIPLE_CHOICE", cfg, ["أ", "ب"]);   // اختيار واحد لا اثنان
});

test("حدّ عدد المختارات", () => {
  const cfg = { options: ["أ", "ب", "ج"], maxSelect: 2 };
  ok("CHECKBOXES", cfg, ["أ", "ب"]);
  bad("CHECKBOXES", cfg, ["أ", "ب", "ج"]);
});

test("اختيار الصور يقرأ العناوين لا الكائنات", () => {
  const cfg = { options: [{ label: "أ", url: "" }, { label: "ب", url: "" }] };
  ok("IMAGE_CHOICE", cfg, "أ");
  bad("IMAGE_CHOICE", cfg, "ج");
});

test("المقاييس تُقيَّد بمداها", () => {
  ok("LINEAR_SCALE", { min: 1, max: 5 }, 3);
  bad("LINEAR_SCALE", { min: 1, max: 5 }, 6);
  bad("LINEAR_SCALE", { min: 1, max: 5 }, 0);
  bad("LINEAR_SCALE", { min: 1, max: 5 }, "نصّ");
  ok("SLIDER", { min: 0, max: 100 }, 100);
  bad("SLIDER", { min: 0, max: 100 }, 101);
  ok("RATING", { max: 5 }, 5);
  bad("RATING", { max: 5 }, 9);
});

test("الرقم ومداه", () => {
  ok("NUMBER", {}, "42");
  bad("NUMBER", {}, "ليس رقماً");
  bad("NUMBER", { min: 10 }, "9");
  bad("NUMBER", { max: 10 }, "11");
  ok("NUMBER", { min: 0, max: 10 }, "0");
});

test("طول النصّ", () => {
  ok("SHORT_TEXT", { maxLength: 5 }, "12345");
  bad("SHORT_TEXT", { maxLength: 5 }, "123456");
  bad("PARAGRAPH", {}, "x".repeat(20_001));  // سقف مطلق
  ok("PARAGRAPH", {}, "x".repeat(20_000));
});

test("البريد والجوال", () => {
  ok("EMAIL", {}, "a@b.co");
  bad("EMAIL", {}, "a@b");
  ok("PHONE", {}, "0512345678");
  ok("PHONE", {}, "+966512345678");
  bad("PHONE", {}, "12");
});

test("التاريخ والوقت", () => {
  ok("DATE", {}, "2026-08-19");
  bad("DATE", {}, "ليس تاريخاً");
  ok("TIME", {}, "23:59");
  ok("TIME", {}, "00:00");
  bad("TIME", {}, "24:00");
  bad("TIME", {}, "9:00");
});

test("الموقع داخل حدود الكرة", () => {
  ok("LOCATION", {}, { lat: 24.7, lng: 46.6 });
  bad("LOCATION", {}, { lat: 91, lng: 0 });
  bad("LOCATION", {}, { lat: 0, lng: 181 });
  bad("LOCATION", {}, "24.7,46.6");
});

test("الشبكة: الصفوف والأعمدة من المعرَّف وحده", () => {
  const cfg = { rows: ["ص1", "ص2"], cols: ["ضعيف", "جيد"], multi: false };
  ok("GRID", cfg, { "ص1": "جيد" });
  bad("GRID", cfg, { "ص-دخيل": "جيد" });
  bad("GRID", cfg, { "ص1": "عمود-دخيل" });
  bad("GRID", cfg, { "ص1": ["ضعيف", "جيد"] });  // multi=false
  ok("GRID", { ...cfg, multi: true }, { "ص1": ["ضعيف", "جيد"] });
});

test("الترتيب: من القائمة وبلا تكرار", () => {
  const cfg = { options: ["أ", "ب", "ج"] };
  ok("RANKING", cfg, ["ج", "أ", "ب"]);
  bad("RANKING", cfg, ["أ", "أ"]);
  bad("RANKING", cfg, ["أ", "دخيل"]);
  bad("RANKING", cfg, "أ");
});

test("الموافقة", () => {
  bad("CONSENT", {}, false, true);
  ok("CONSENT", {}, true, true);
  ok("CONSENT", {}, false, false);
});
