-- الموجة الرابعة: سجل تسليم الروابط الخارجية (Webhook / Google Sheets) — آمن للتكرار
CREATE TABLE IF NOT EXISTS "WebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL DEFAULT '',
    -- نوع الوجهة: webhook | sheets
    "kind" TEXT NOT NULL DEFAULT 'webhook',
    "url" TEXT NOT NULL DEFAULT '',
    "ok" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "WebhookLog_formId_idx" ON "WebhookLog"("formId");
