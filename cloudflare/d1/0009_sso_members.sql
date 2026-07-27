-- الدخول الموحّد (١/١): جدول الأعضاء المحلي وجدول الربط بالهوية المركزية.
-- هجرة جديدة للأمام فقط — لا تعديل على 0001..0008، فقد طُبِّقت في الإنتاج.
--
-- لماذا جدولان لا جدول واحد:
-- المنصة لها نظام مستخدمين قائم، و"Project"."ownerId" و "Form"."ownerId"
-- تحملان "User"."id" المحلي. جدول أعضاء بمعرّف المركز (sub) وحده يجعل كل
-- مشروع ونموذج قائم بلا مالك معروف. فالمعرّفان يتعايشان: `members` مفتاحه
-- sub وهو ما تقرأه naf-auth، و`MemberLink` يربطه بالمعرّف المحلي وهو ما
-- تقرأه الملكية القائمة.

-- جدول الأعضاء — مخطّط §٥ من وثيقة الربط حرفياً، وهو DEFAULT_SCHEMA في
-- naf-auth، فلا يحتاج ضبط أعمدة في wrangler.toml.
CREATE TABLE IF NOT EXISTS members (
  user_id      TEXT PRIMARY KEY,   -- sub القادم من المركز
  display_name TEXT,
  email        TEXT,
  role         TEXT NOT NULL DEFAULT 'viewer',   -- admin | editor | viewer
  perms        TEXT,               -- JSON للصلاحيات الدقيقة
  is_active    INTEGER NOT NULL DEFAULT 1,
  last_seen_at INTEGER,
  created_at   INTEGER NOT NULL
);

-- البحث بالبريد عند مطابقة عضو قادم بسجلّ قائم (يستعمله onClaims).
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- جدول الربط: هوية المركز ← الهوية المحلية.
-- سطر واحد لكل عضو، ويُنشأ مرة واحدة عند أول دخول موحّد.
CREATE TABLE IF NOT EXISTS "MemberLink" (
  "user_id"       TEXT NOT NULL PRIMARY KEY,   -- sub — نفس مفتاح members
  "localUserId"   TEXT NOT NULL,               -- "User"."id" القائم
  "linkedAt"      INTEGER NOT NULL,
  "linkedBy"      TEXT NOT NULL DEFAULT 'email_match'  -- email_match | manual
);

-- عضو مركزي واحد لكل مستخدم محلي: يمنع ربط حسابين مركزيين بمالك واحد،
-- وهو ما كان سيجعل الملكية غامضة عند سحب أحدهما.
CREATE UNIQUE INDEX IF NOT EXISTS "MemberLink_localUserId_key"
  ON "MemberLink"("localUserId");
