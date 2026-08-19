import { test } from "node:test";
import assert from "node:assert/strict";
import { toPublicForm, toLockedForm, type PublicFormSource } from "../src/lib/public-form";

// ما يصل المتصفّح في صفحة التعبئة العامة. أي تسريب هنا يخرج إلى الإنترنت.
const SECRETS = {
  access: { password: "س1ر", oneResponsePerEmail: true },
  integrations: { apiToken: "رمز-سرّي", sheetsUrl: "https://script.google.com/x", apiEnabled: true },
  notify: { email: "admin@naflaw.sa", webhookUrl: "https://hooks.example/x" },
  theme: { primary: "#937133" },
  exam: { shuffle: true },
};

const form = (): PublicFormSource => ({
  id: "f1", slug: "s1", title: "عنوان", description: "وصف",
  type: "EXAM", status: "PUBLISHED",
  settings: JSON.stringify(SECRETS),
  questions: [
    { id: "q1", order: 0, type: "MULTIPLE_CHOICE", label: "سؤال", description: "",
      required: true,
      config: JSON.stringify({ options: ["أ", "ب"], correctAnswer: "أ", points: 5 }) },
  ],
});

test("لا تُرسَل الأسرار: كلمة المرور والتكاملات والإشعارات", () => {
  const dto = toPublicForm(form());
  const raw = JSON.stringify(dto);
  assert.deepEqual(dto.settings.access, {});
  assert.deepEqual(dto.settings.integrations, {});
  assert.deepEqual(dto.settings.notify, {});
  for (const secret of ["س1ر", "رمز-سرّي", "admin@naflaw.sa", "hooks.example", "script.google.com"])
    assert.equal(raw.includes(secret), false, `تسرّب: ${secret}`);
});

test("لا تُرسَل الإجابات الصحيحة ولا الدرجات", () => {
  const dto = toPublicForm(form());
  const cfg: any = dto.questions[0].config;
  assert.equal("correctAnswer" in cfg, false);
  assert.equal("points" in cfg, false);
  assert.deepEqual(cfg.options, ["أ", "ب"], "والخيارات تبقى — بها يُجاب");
});

test("ما يحتاجه المستفيد يبقى", () => {
  const dto = toPublicForm(form());
  assert.equal(dto.title, "عنوان");
  assert.equal(dto.settings.theme?.primary, "#937133");
  assert.equal(dto.settings.exam?.shuffle, true);
});

test("النموذج المحميّ لا يحمل سؤالاً واحداً قبل كلمة المرور", () => {
  const dto = toLockedForm(form());
  assert.deepEqual(dto.questions, [], "الأسئلة هي ما كان يُسرَّب في مصدر الصفحة");
  assert.equal(dto.description, "", "ولا الوصف");
  const raw = JSON.stringify(dto);
  for (const leak of ["سؤال", "أ", "س1ر", "رمز-سرّي"])
    if (leak !== "أ") assert.equal(raw.includes(leak), false, `تسرّب: ${leak}`);
});

test("المحميّ يحمل ما تعرضه بوابة الإدخال: العنوان ولون السطح", () => {
  const dto = toLockedForm(form());
  assert.equal(dto.title, "عنوان");
  assert.equal(dto.settings.theme?.primary, "#937133");
  assert.deepEqual(dto.settings.content, { links: [], files: [] });
  assert.deepEqual(dto.settings.cover, {});
});
