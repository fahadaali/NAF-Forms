import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeAnswer, computeVisibleQuestions } from "../src/lib/utils";

test("سؤال بلا إجابة صحيحة لا يُحتسب", () => {
  assert.deepEqual(gradeAnswer("SHORT_TEXT", {}, "أي شيء"), { correct: false, points: 0 });
  assert.deepEqual(gradeAnswer("SHORT_TEXT", { correctAnswer: "" }, "x"), { correct: false, points: 0 });
});

test("التصحيح النصّي يتجاهل الفراغ المحيط", () => {
  const cfg = { correctAnswer: "الرياض", points: 2 };
  assert.deepEqual(gradeAnswer("SHORT_TEXT", cfg, "  الرياض  "), { correct: true, points: 2 });
  assert.deepEqual(gradeAnswer("SHORT_TEXT", cfg, "جدة"), { correct: false, points: 0 });
});

test("الدرجة الافتراضية واحدة", () => {
  assert.equal(gradeAnswer("SHORT_TEXT", { correctAnswer: "أ" }, "أ").points, 1);
});

test("مربعات الاختيار: المجموعة كاملةً لا بعضها", () => {
  const cfg = { correctAnswer: ["أ", "ب"], points: 3 };
  assert.deepEqual(gradeAnswer("CHECKBOXES", cfg, ["ب", "أ"]), { correct: true, points: 3 }, "الترتيب لا يهمّ");
  assert.deepEqual(gradeAnswer("CHECKBOXES", cfg, ["أ"]), { correct: false, points: 0 }, "ناقصة");
  assert.deepEqual(gradeAnswer("CHECKBOXES", cfg, ["أ", "ب", "ج"]), { correct: false, points: 0 }, "زائدة");
});

// ── المنطق الشرطي ووراثة القسم
const q = (id: string, type: string, config: any = {}) => ({ id, type, config });

test("بلا شرط يظهر كل شيء", () => {
  const qs = [q("a", "SHORT_TEXT"), q("b", "SHORT_TEXT")];
  assert.equal(computeVisibleQuestions(qs, {}).length, 2);
});

test("الشرط eq و neq و contains", () => {
  const eq = q("b", "SHORT_TEXT", { logic: { whenQuestionId: "a", operator: "eq", value: "نعم" } });
  assert.equal(computeVisibleQuestions([q("a", "SHORT_TEXT"), eq], { a: "نعم" }).length, 2);
  assert.equal(computeVisibleQuestions([q("a", "SHORT_TEXT"), eq], { a: "لا" }).length, 1);

  const neq = q("b", "SHORT_TEXT", { logic: { whenQuestionId: "a", operator: "neq", value: "نعم" } });
  assert.equal(computeVisibleQuestions([q("a", "SHORT_TEXT"), neq], { a: "لا" }).length, 2);

  const has = q("b", "SHORT_TEXT", { logic: { whenQuestionId: "a", operator: "contains", value: "ب" } });
  assert.equal(computeVisibleQuestions([q("a", "CHECKBOXES"), has], { a: ["أ", "ب"] }).length, 2);
  assert.equal(computeVisibleQuestions([q("a", "CHECKBOXES"), has], { a: ["أ"] }).length, 1);
});

test("إخفاء القسم يُخفي ما تحته", () => {
  const qs = [
    q("s", "SECTION", { logic: { whenQuestionId: "a", operator: "eq", value: "نعم" } }),
    q("b", "SHORT_TEXT"),
    q("c", "SHORT_TEXT"),
  ];
  assert.equal(computeVisibleQuestions(qs, { a: "نعم" }).length, 3);
  assert.equal(computeVisibleQuestions(qs, { a: "لا" }).length, 0, "القسم وما تحته");
});

test("قسم ظاهر بعد قسم مخفيّ يستعيد الظهور", () => {
  const qs = [
    q("s1", "SECTION", { logic: { whenQuestionId: "a", operator: "eq", value: "نعم" } }),
    q("b", "SHORT_TEXT"),
    q("s2", "SECTION"),
    q("c", "SHORT_TEXT"),
  ];
  const ids = computeVisibleQuestions(qs, { a: "لا" }).map((x: any) => x.id);
  assert.deepEqual(ids, ["s2", "c"]);
});

test("config كنصّ JSON يُقرأ كما يُقرأ الكائن", () => {
  const qs = [
    { id: "a", type: "SHORT_TEXT", config: "{}" },
    { id: "b", type: "SHORT_TEXT",
      config: JSON.stringify({ logic: { whenQuestionId: "a", operator: "eq", value: "نعم" } }) },
  ];
  assert.equal(computeVisibleQuestions(qs, { a: "نعم" }).length, 2);
  assert.equal(computeVisibleQuestions(qs, { a: "لا" }).length, 1);
});
