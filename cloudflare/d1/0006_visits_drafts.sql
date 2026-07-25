-- الموجة الثانية: تحليلات الإكمال + حفظ ومتابعة لاحقًا (آمن للتكرار)

-- زيارة/محاولة تعبئة: تُنشأ عند بدء التعبئة وتُختم عند الإرسال.
-- تُستخدم لحساب معدّل الإكمال، ونقاط التسرّب، وزمن التعبئة.
CREATE TABLE IF NOT EXISTS "Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "lastQuestionId" TEXT NOT NULL DEFAULT '',
    "responseId" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "Visit_formId_idx" ON "Visit"("formId");

-- مسودّة رد محفوظة لمتابعتها لاحقًا برابط استئناف
CREATE TABLE IF NOT EXISTS "Draft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "email" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "Draft_formId_idx" ON "Draft"("formId");
