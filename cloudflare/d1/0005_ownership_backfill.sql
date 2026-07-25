-- الموجة الأولى (٢/٢): الفهارس وإسناد البيانات القائمة (آمن للتكرار).
CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");
CREATE INDEX IF NOT EXISTS "Form_ownerId_idx" ON "Form"("ownerId");

-- إسناد ما أُنشئ قبل نظام الملكية إلى أول حساب مسؤول، مع استثناء مشروع
-- القوالب والقوالب نفسها فتبقى مشتركة للجميع.
UPDATE "Project"
SET "ownerId" = (SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1)
WHERE "ownerId" = '' AND "id" != 'system-templates';

UPDATE "Form"
SET "ownerId" = (SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1)
WHERE "ownerId" = '' AND "isTemplate" = 0;
