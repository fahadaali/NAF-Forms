-- الموجة الأولى (١/٢): إضافة الأعمدة.
-- SQLite لا يدعم "ADD COLUMN IF NOT EXISTS"، لذا يُنفَّذ هذا الملف في تدفّق
-- النشر بتجاوز الخطأ إن كانت الأعمدة مضافة مسبقًا. لا تضع هنا أي شيء آخر،
-- فالبقية في 0005 لتُنفَّذ دائمًا.

-- إصدار الجلسة: زيادته تُبطل كل الجلسات القديمة للمستخدم
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- مالك المشروع/النموذج (فارغ = ملك النظام مثل مشروع القوالب)
ALTER TABLE "Project" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Form" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT '';
