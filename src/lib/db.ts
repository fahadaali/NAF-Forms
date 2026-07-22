// طبقة استعلامات موحّدة تعمل في بيئتين:
//  - على Cloudflare Workers: عبر ربط D1 الأصلي (env.DB) بلا Prisma ولا محرّك WASM.
//  - محليًا (Node): عبر better-sqlite3 على ملف dev.db مع تهيئة المخطط تلقائيًا.
//
// الواجهة الموحّدة (كلها غير متزامنة لتوحيد الاستخدام):
//   all(sql, params)   -> صفوف []            (SELECT متعدد)
//   first(sql, params) -> صف واحد أو null     (SELECT مفرد)
//   run(sql, params)   -> تنفيذ بلا نتائج     (INSERT/UPDATE/DELETE)
import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface Db {
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  first<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<void>;
}

// مخطّط قاعدة البيانات (نسخة مطابقة لـ cloudflare/d1/0001_init.sql) لتهيئة dev.db محليًا
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "passwordHash" TEXT NOT NULL,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "color" TEXT NOT NULL DEFAULT '#1c59f5',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "Form" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "type" TEXT NOT NULL DEFAULT 'SURVEY',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "settings" TEXT NOT NULL DEFAULT '{}',
  "isTemplate" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "Question" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "config" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Response" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formId" TEXT NOT NULL,
  "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "meta" TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS "Answer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "responseId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "value" TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Form_slug_key" ON "Form"("slug");
CREATE INDEX IF NOT EXISTS "Form_projectId_idx" ON "Form"("projectId");
CREATE INDEX IF NOT EXISTS "Question_formId_idx" ON "Question"("formId");
CREATE INDEX IF NOT EXISTS "Response_formId_idx" ON "Response"("formId");
CREATE INDEX IF NOT EXISTS "Answer_responseId_idx" ON "Answer"("responseId");
CREATE INDEX IF NOT EXISTS "Answer_questionId_idx" ON "Answer"("questionId");
`;

// ---- مغلّف D1 (Workers) ----
function d1Wrapper(DB: any): Db {
  const stmt = (sql: string, params: any[] = []) => {
    const s = DB.prepare(sql);
    return params.length ? s.bind(...params) : s;
  };
  return {
    async all(sql, params = []) {
      const r = await stmt(sql, params).all();
      return (r?.results ?? []) as any[];
    },
    async first(sql, params = []) {
      return ((await stmt(sql, params).first()) ?? null) as any;
    },
    async run(sql, params = []) {
      await stmt(sql, params).run();
    },
  };
}

// ---- مغلّف better-sqlite3 (محلي) ----
const g = globalThis as unknown as { __nafSqlite?: any };

function localDb(): Db {
  if (!g.__nafSqlite) {
    // require ديناميكي حتى لا يُجمّع في حزمة Workers
    const Database = require("better-sqlite3");
    const url = process.env.DATABASE_URL || "file:./dev.db";
    const file = url.startsWith("file:") ? url.slice(5) : url;
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA_SQL);
    g.__nafSqlite = db;
  }
  const db = g.__nafSqlite;
  return {
    async all(sql, params = []) {
      return db.prepare(sql).all(...params);
    },
    async first(sql, params = []) {
      return db.prepare(sql).get(...params) ?? null;
    },
    async run(sql, params = []) {
      db.prepare(sql).run(...params);
    },
  };
}

// اختيار الطبقة المناسبة حسب البيئة
export function getDb(): Db {
  try {
    const { env } = getCloudflareContext();
    const DB = (env as any)?.DB;
    if (DB) return d1Wrapper(DB);
  } catch {
    // خارج سياق Cloudflare (تطوير محلي) — نتابع إلى better-sqlite3
  }
  return localDb();
}
