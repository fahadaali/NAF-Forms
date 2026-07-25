-- الموجة الثالثة: مراجعة الردود (تتبّع المتقدمين) — آمن للتكرار
-- الحالة + التقييم + الملاحظات الداخلية لكل رد، في جدول مستقل حتى لا نحتاج
-- تعديل جدول الردود (ALTER) الذي لا يقبل التكرار في SQLite.
CREATE TABLE IF NOT EXISTS "ResponseReview" (
    "responseId" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "rating" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "ResponseReview_status_idx" ON "ResponseReview"("status");
