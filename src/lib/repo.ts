// طبقة الوصول إلى البيانات (Repository) فوق D1 الأصلي / better-sqlite3.
// تُعيد الدوال كائنات بنفس شكل نتائج Prisma السابقة (علاقات + عدّادات + تواريخ Date)
// حتى تبقى مواضع الاستدعاء في التطبيق كما هي تقريبًا.
import { nanoid } from "nanoid";
import { getDb, type Db } from "./db";
import { NAF_PRIMARY } from "./brand";

const now = () => new Date().toISOString();

// تحويل نص التاريخ (ISO أو صيغة SQLite بمسافة) إلى Date
function toDate(v: any): Date {
  if (v instanceof Date) return v;
  const s = String(v ?? "");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s))
    return new Date(s.replace(" ", "T") + "Z");
  return new Date(s);
}

const toBool = (v: any) => v === 1 || v === true || v === "1" || v === "true";

const asConfig = (c: any) =>
  typeof c === "string" ? c : JSON.stringify(c ?? {});

// ---- محوّلات الصفوف ----
function mapUser(r: any) {
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    passwordHash: r.passwordHash,
    mustChangePassword: toBool(r.mustChangePassword),
    sessionVersion: Number(r.sessionVersion ?? 0),
    createdAt: toDate(r.createdAt),
  };
}
function mapProject(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    ownerId: r.ownerId ?? "",
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
  };
}
function mapForm(r: any) {
  return {
    id: r.id,
    slug: r.slug,
    projectId: r.projectId,
    title: r.title,
    description: r.description,
    type: r.type,
    status: r.status,
    settings: r.settings,
    isTemplate: toBool(r.isTemplate),
    ownerId: r.ownerId ?? "",
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
  };
}
function mapQuestion(r: any) {
  return {
    id: r.id,
    formId: r.formId,
    order: Number(r.order),
    type: r.type,
    label: r.label,
    description: r.description,
    required: toBool(r.required),
    config: r.config,
    createdAt: toDate(r.createdAt),
  };
}
function mapResponse(r: any) {
  return {
    id: r.id,
    formId: r.formId,
    submittedAt: toDate(r.submittedAt),
    meta: r.meta,
  };
}
function mapAnswer(r: any) {
  return {
    id: r.id,
    responseId: r.responseId,
    questionId: r.questionId,
    value: r.value,
  };
}

// أنواع مساعدة للإدخال
export interface QuestionInput {
  order?: number;
  type: string;
  label?: string;
  description?: string;
  required?: boolean;
  config?: any;
}

// ============================ المستخدمون ============================
export async function getUserByEmail(email: string) {
  const r = await getDb().first(`SELECT * FROM "User" WHERE "email" = ?`, [email]);
  return r ? mapUser(r) : null;
}
export async function getUserById(id: string) {
  const r = await getDb().first(`SELECT * FROM "User" WHERE "id" = ?`, [id]);
  return r ? mapUser(r) : null;
}
export async function listUsers() {
  const rows = await getDb().all(`SELECT * FROM "User" ORDER BY "createdAt" ASC`);
  return rows.map(mapUser);
}
export async function createUser(data: {
  email: string;
  role: string;
  passwordHash: string;
  mustChangePassword: boolean;
}) {
  const db = getDb();
  const id = nanoid();
  await db.run(
    `INSERT INTO "User" ("id","email","role","passwordHash","mustChangePassword","createdAt") VALUES (?,?,?,?,?,?)`,
    [id, data.email, data.role, data.passwordHash, data.mustChangePassword ? 1 : 0, now()]
  );
  return (await getUserById(id))!;
}
export async function updateUser(
  id: string,
  data: {
    role?: string;
    passwordHash?: string;
    mustChangePassword?: boolean;
    // زيادة إصدار الجلسة تُبطل كل الجلسات القديمة (بعد تغيير/إعادة كلمة المرور)
    bumpSessionVersion?: boolean;
  }
) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (data.role !== undefined) {
    sets.push(`"role" = ?`);
    vals.push(data.role);
  }
  if (data.passwordHash !== undefined) {
    sets.push(`"passwordHash" = ?`);
    vals.push(data.passwordHash);
  }
  if (data.mustChangePassword !== undefined) {
    sets.push(`"mustChangePassword" = ?`);
    vals.push(data.mustChangePassword ? 1 : 0);
  }
  if (data.bumpSessionVersion) {
    sets.push(`"sessionVersion" = "sessionVersion" + 1`);
  }
  if (sets.length) {
    vals.push(id);
    await getDb().run(`UPDATE "User" SET ${sets.join(", ")} WHERE "id" = ?`, vals);
  }
  return getUserById(id);
}
export async function deleteUser(id: string) {
  await getDb().run(`DELETE FROM "User" WHERE "id" = ?`, [id]);
}

// ============================ المشاريع ============================
// قائمة المشاريع: المسؤول يرى الكل، والعضو يرى مشاريعه فقط (ownerId = null للمسؤول)
export async function listProjects(ownerId?: string | null) {
  const db = getDb();
  const rows = ownerId
    ? await db.all(
        `SELECT * FROM "Project" WHERE "id" != ? AND "ownerId" = ? ORDER BY "updatedAt" DESC`,
        ["system-templates", ownerId]
      )
    : await db.all(
        `SELECT * FROM "Project" WHERE "id" != ? ORDER BY "updatedAt" DESC`,
        ["system-templates"]
      );
  const counts = await db.all(
    `SELECT "projectId", COUNT(*) as c FROM "Form" WHERE "isTemplate" = 0 GROUP BY "projectId"`
  );
  const cmap = new Map<string, number>(
    counts.map((r: any) => [r.projectId, Number(r.c)])
  );
  return rows.map((r: any) => ({
    ...mapProject(r),
    _count: { forms: cmap.get(r.id) || 0 },
  }));
}

export async function getProjectById(id: string) {
  const db = getDb();
  const p = await db.first(`SELECT * FROM "Project" WHERE "id" = ?`, [id]);
  if (!p) return null;
  const forms = await db.all(
    `SELECT * FROM "Form" WHERE "projectId" = ? AND "isTemplate" = 0 ORDER BY "updatedAt" DESC`,
    [id]
  );
  // عدّادات مجمّعة باستعلامين فقط بدل استعلامين لكل نموذج (تفادي N+1)
  const respCounts = await db.all(
    `SELECT "formId", COUNT(*) as c FROM "Response"
     WHERE "formId" IN (SELECT "id" FROM "Form" WHERE "projectId" = ?)
     GROUP BY "formId"`,
    [id]
  );
  const qCounts = await db.all(
    `SELECT "formId", COUNT(*) as c FROM "Question"
     WHERE "formId" IN (SELECT "id" FROM "Form" WHERE "projectId" = ?)
     GROUP BY "formId"`,
    [id]
  );
  const rMap = new Map<string, number>(
    respCounts.map((r: any) => [r.formId, Number(r.c)])
  );
  const qMap = new Map<string, number>(
    qCounts.map((r: any) => [r.formId, Number(r.c)])
  );
  const withCounts = forms.map((f: any) => ({
    ...mapForm(f),
    _count: {
      responses: rMap.get(f.id) || 0,
      questions: qMap.get(f.id) || 0,
    },
  }));
  return { ...mapProject(p), forms: withCounts };
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
  ownerId?: string;
}) {
  const db = getDb();
  const id = nanoid();
  const ts = now();
  await db.run(
    `INSERT INTO "Project" ("id","name","description","color","ownerId","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?)`,
    [
      id,
      data.name,
      data.description ?? "",
      data.color ?? NAF_PRIMARY,
      data.ownerId ?? "",
      ts,
      ts,
    ]
  );
  return mapProject(await db.first(`SELECT * FROM "Project" WHERE "id" = ?`, [id]));
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; color?: string }
) {
  const db = getDb();
  const sets: string[] = [];
  const vals: any[] = [];
  if (data.name !== undefined) {
    sets.push(`"name" = ?`);
    vals.push(data.name);
  }
  if (data.description !== undefined) {
    sets.push(`"description" = ?`);
    vals.push(data.description);
  }
  if (data.color !== undefined) {
    sets.push(`"color" = ?`);
    vals.push(data.color);
  }
  sets.push(`"updatedAt" = ?`);
  vals.push(now());
  vals.push(id);
  await db.run(`UPDATE "Project" SET ${sets.join(", ")} WHERE "id" = ?`, vals);
  return mapProject(await db.first(`SELECT * FROM "Project" WHERE "id" = ?`, [id]));
}

export async function deleteProject(id: string) {
  const db = getDb();
  const forms = await db.all(`SELECT "id" FROM "Form" WHERE "projectId" = ?`, [id]);
  for (const f of forms) await deleteFormCascade(db, f.id);
  await db.run(`DELETE FROM "Project" WHERE "id" = ?`, [id]);
}

// إنشاء مشروع بمعرّف ثابت إن لم يكن موجودًا (يُستخدم لمشروع القوالب)
export async function ensureProject(data: {
  id: string;
  name: string;
  description?: string;
  color?: string;
}) {
  const db = getDb();
  const existing = await db.first(`SELECT "id" FROM "Project" WHERE "id" = ?`, [
    data.id,
  ]);
  if (existing) return;
  const ts = now();
  await db.run(
    `INSERT INTO "Project" ("id","name","description","color","createdAt","updatedAt") VALUES (?,?,?,?,?,?)`,
    [data.id, data.name, data.description ?? "", data.color ?? NAF_PRIMARY, ts, ts]
  );
}

// ============================ النماذج ============================
async function insertQuestions(db: Db, formId: string, questions: QuestionInput[]) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await db.run(
      `INSERT INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt") VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        nanoid(),
        formId,
        q.order ?? i,
        q.type,
        q.label ?? "",
        q.description ?? "",
        q.required ? 1 : 0,
        asConfig(q.config),
        now(),
      ]
    );
  }
}

export async function createForm(
  data: {
    slug: string;
    projectId: string;
    title: string;
    description?: string;
    type?: string;
    status?: string;
    settings?: string;
    isTemplate?: boolean;
    ownerId?: string;
  },
  questions: QuestionInput[] = []
) {
  const db = getDb();
  const id = nanoid();
  const ts = now();
  await db.run(
    `INSERT INTO "Form" ("id","slug","projectId","title","description","type","status","settings","isTemplate","ownerId","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      data.slug,
      data.projectId,
      data.title,
      data.description ?? "",
      data.type ?? "SURVEY",
      data.status ?? "DRAFT",
      data.settings ?? "{}",
      data.isTemplate ? 1 : 0,
      data.ownerId ?? "",
      ts,
      ts,
    ]
  );
  if (questions.length) await insertQuestions(db, id, questions);
  return mapForm(await db.first(`SELECT * FROM "Form" WHERE "id" = ?`, [id]));
}

export async function getFormWithQuestions(id: string) {
  const db = getDb();
  const f = await db.first(`SELECT * FROM "Form" WHERE "id" = ?`, [id]);
  if (!f) return null;
  const qs = await db.all(
    `SELECT * FROM "Question" WHERE "formId" = ? ORDER BY "order" ASC`,
    [id]
  );
  return { ...mapForm(f), questions: qs.map(mapQuestion) };
}

export async function getFormBySlug(slug: string) {
  const db = getDb();
  const f = await db.first(`SELECT * FROM "Form" WHERE "slug" = ?`, [slug]);
  if (!f) return null;
  const qs = await db.all(
    `SELECT * FROM "Question" WHERE "formId" = ? ORDER BY "order" ASC`,
    [f.id]
  );
  return { ...mapForm(f), questions: qs.map(mapQuestion) };
}

// هل الرابط (slug) متاح؟ (يتجاهل النموذج نفسه عند التعديل)
export async function isSlugAvailable(
  slug: string,
  exceptFormId?: string
): Promise<boolean> {
  const r = await getDb().first(
    `SELECT "id" FROM "Form" WHERE "slug" = ?`,
    [slug]
  );
  if (!r) return true;
  return !!exceptFormId && r.id === exceptFormId;
}

// نموذج عام لصفحة التعبئة: أسئلة + عدد الردود
export async function getPublicForm(slug: string) {
  const form = await getFormBySlug(slug);
  if (!form) return null;
  const rc = await getDb().first(
    `SELECT COUNT(*) as c FROM "Response" WHERE "formId" = ?`,
    [form.id]
  );
  return { ...form, _count: { responses: Number(rc?.c || 0) } };
}

export async function updateForm(
  id: string,
  data: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    settings?: string;
    slug?: string;
  }
) {
  const db = getDb();
  const sets: string[] = [];
  const vals: any[] = [];
  for (const k of [
    "title",
    "description",
    "type",
    "status",
    "settings",
    "slug",
  ] as const) {
    if (data[k] !== undefined) {
      sets.push(`"${k}" = ?`);
      vals.push(data[k]);
    }
  }
  sets.push(`"updatedAt" = ?`);
  vals.push(now());
  vals.push(id);
  await db.run(`UPDATE "Form" SET ${sets.join(", ")} WHERE "id" = ?`, vals);
}

async function deleteFormCascade(db: Db, formId: string) {
  await db.run(
    `DELETE FROM "Answer" WHERE "responseId" IN (SELECT "id" FROM "Response" WHERE "formId" = ?)`,
    [formId]
  );
  await db.run(`DELETE FROM "Response" WHERE "formId" = ?`, [formId]);
  await db.run(`DELETE FROM "Question" WHERE "formId" = ?`, [formId]);
  await db.run(`DELETE FROM "Form" WHERE "id" = ?`, [formId]);
}
export async function deleteForm(id: string) {
  await deleteFormCascade(getDb(), id);
}

export async function listTemplates() {
  const db = getDb();
  const rows = await db.all(
    `SELECT * FROM "Form" WHERE "isTemplate" = 1 ORDER BY "createdAt" ASC`
  );
  // عدّاد الأسئلة باستعلام واحد مجمّع (تفادي N+1)
  const qCounts = await db.all(
    `SELECT "formId", COUNT(*) as c FROM "Question"
     WHERE "formId" IN (SELECT "id" FROM "Form" WHERE "isTemplate" = 1)
     GROUP BY "formId"`
  );
  const qMap = new Map<string, number>(
    qCounts.map((r: any) => [r.formId, Number(r.c)])
  );
  return rows.map((f: any) => ({
    ...mapForm(f),
    _count: { questions: qMap.get(f.id) || 0 },
  }));
}

export async function countForms(isTemplate: boolean, ownerId?: string | null) {
  const db = getDb();
  const r = ownerId
    ? await db.first(
        `SELECT COUNT(*) as c FROM "Form" WHERE "isTemplate" = ? AND "ownerId" = ?`,
        [isTemplate ? 1 : 0, ownerId]
      )
    : await db.first(`SELECT COUNT(*) as c FROM "Form" WHERE "isTemplate" = ?`, [
        isTemplate ? 1 : 0,
      ]);
  return Number(r?.c || 0);
}

// ============================ الأسئلة (مزامنة البناء) ============================
export async function getQuestionIds(formId: string) {
  const rows = await getDb().all(
    `SELECT "id" FROM "Question" WHERE "formId" = ?`,
    [formId]
  );
  return rows.map((r: any) => r.id as string);
}
export async function deleteQuestions(ids: string[]) {
  if (!ids.length) return;
  const db = getDb();
  const ph = ids.map(() => "?").join(",");
  await db.run(`DELETE FROM "Answer" WHERE "questionId" IN (${ph})`, ids);
  await db.run(`DELETE FROM "Question" WHERE "id" IN (${ph})`, ids);
}
export async function updateQuestion(id: string, p: QuestionInput) {
  await getDb().run(
    `UPDATE "Question" SET "order" = ?, "type" = ?, "label" = ?, "description" = ?, "required" = ?, "config" = ? WHERE "id" = ?`,
    [
      p.order ?? 0,
      p.type,
      p.label ?? "",
      p.description ?? "",
      p.required ? 1 : 0,
      asConfig(p.config),
      id,
    ]
  );
}
export async function createQuestion(formId: string, p: QuestionInput) {
  await getDb().run(
    `INSERT INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt") VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      nanoid(),
      formId,
      p.order ?? 0,
      p.type,
      p.label ?? "",
      p.description ?? "",
      p.required ? 1 : 0,
      asConfig(p.config),
      now(),
    ]
  );
}

// ============================ الردود ============================
export async function countResponses(formId?: string) {
  const db = getDb();
  const r = formId
    ? await db.first(`SELECT COUNT(*) as c FROM "Response" WHERE "formId" = ?`, [
        formId,
      ])
    : await db.first(`SELECT COUNT(*) as c FROM "Response"`);
  return Number(r?.c || 0);
}

// إجمالي الردود لنماذج مالك معيّن (null = الكل، للمسؤول)
export async function countResponsesByOwner(ownerId?: string | null) {
  const db = getDb();
  const r = ownerId
    ? await db.first(
        `SELECT COUNT(*) as c FROM "Response"
         WHERE "formId" IN (SELECT "id" FROM "Form" WHERE "ownerId" = ?)`,
        [ownerId]
      )
    : await db.first(`SELECT COUNT(*) as c FROM "Response"`);
  return Number(r?.c || 0);
}

export async function getResponsesMeta(formId: string) {
  const rows = await getDb().all(
    `SELECT "meta" FROM "Response" WHERE "formId" = ?`,
    [formId]
  );
  return rows.map((r: any) => ({ meta: r.meta as string }));
}

export async function createResponse(
  formId: string,
  meta: string,
  answers: { questionId: string; value: string }[]
) {
  const db = getDb();
  const id = nanoid();
  const ts = now();
  await db.run(
    `INSERT INTO "Response" ("id","formId","submittedAt","meta") VALUES (?,?,?,?)`,
    [id, formId, ts, meta]
  );
  for (const a of answers) {
    await db.run(
      `INSERT INTO "Answer" ("id","responseId","questionId","value") VALUES (?,?,?,?)`,
      [nanoid(), id, a.questionId, a.value]
    );
  }
  return { id, submittedAt: toDate(ts) };
}

export async function deleteResponse(id: string) {
  const db = getDb();
  await db.run(`DELETE FROM "Answer" WHERE "responseId" = ?`, [id]);
  await db.run(`DELETE FROM "Response" WHERE "id" = ?`, [id]);
}

// ============================ سجل التسليم الخارجي ============================
export async function logDelivery(d: {
  formId: string;
  responseId: string;
  kind: string;
  url: string;
  ok: boolean;
  status: number;
  attempts: number;
  error: string;
}) {
  await getDb().run(
    `INSERT INTO "WebhookLog" ("id","formId","responseId","kind","url","ok","status","attempts","error","createdAt")
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      nanoid(),
      d.formId,
      d.responseId,
      d.kind,
      d.url,
      d.ok ? 1 : 0,
      d.status,
      d.attempts,
      d.error.slice(0, 500),
      now(),
    ]
  );
}

export async function listDeliveries(formId: string, limit = 50) {
  const rows = await getDb().all(
    `SELECT * FROM "WebhookLog" WHERE "formId" = ? ORDER BY "createdAt" DESC LIMIT ?`,
    [formId, limit]
  );
  return rows.map((r: any) => ({
    id: r.id,
    responseId: r.responseId,
    kind: r.kind,
    url: r.url,
    ok: toBool(r.ok),
    status: Number(r.status ?? 0),
    attempts: Number(r.attempts ?? 0),
    error: r.error || "",
    createdAt: toDate(r.createdAt),
  }));
}

// ============================ مراجعة الردود (تتبّع المتقدمين) ============================
export interface ReviewRow {
  responseId: string;
  status: string;
  rating: number;
  notes: string;
}

function mapReview(r: any): ReviewRow {
  return {
    responseId: r.responseId,
    status: r.status || "NEW",
    rating: Number(r.rating ?? 0),
    notes: r.notes ?? "",
  };
}

// مراجعات كل ردود نموذج (مفهرسة بمعرّف الرد)
export async function getReviewsByForm(formId: string) {
  const rows = await getDb().all(
    `SELECT * FROM "ResponseReview"
     WHERE "responseId" IN (SELECT "id" FROM "Response" WHERE "formId" = ?)`,
    [formId]
  );
  const map: Record<string, ReviewRow> = {};
  for (const r of rows) map[r.responseId] = mapReview(r);
  return map;
}

export async function upsertReview(
  responseId: string,
  data: { status?: string; rating?: number; notes?: string }
) {
  const db = getDb();
  const ts = now();
  const existing = await db.first(
    `SELECT * FROM "ResponseReview" WHERE "responseId" = ?`,
    [responseId]
  );
  if (!existing) {
    await db.run(
      `INSERT INTO "ResponseReview" ("responseId","status","rating","notes","updatedAt") VALUES (?,?,?,?,?)`,
      [
        responseId,
        data.status ?? "NEW",
        Number(data.rating ?? 0),
        data.notes ?? "",
        ts,
      ]
    );
  } else {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.status !== undefined) {
      sets.push(`"status" = ?`);
      vals.push(data.status);
    }
    if (data.rating !== undefined) {
      sets.push(`"rating" = ?`);
      vals.push(Number(data.rating));
    }
    if (data.notes !== undefined) {
      sets.push(`"notes" = ?`);
      vals.push(data.notes);
    }
    sets.push(`"updatedAt" = ?`);
    vals.push(ts, responseId);
    await db.run(
      `UPDATE "ResponseReview" SET ${sets.join(", ")} WHERE "responseId" = ?`,
      vals
    );
  }
  const fresh = await db.first(
    `SELECT * FROM "ResponseReview" WHERE "responseId" = ?`,
    [responseId]
  );
  return fresh ? mapReview(fresh) : null;
}

// عدد المحاولات المسجّلة ببريد معيّن (لسياسة إعادة محاولة الاختبار)
export async function countAttemptsByEmail(formId: string, email: string) {
  const rows = await getDb().all(
    `SELECT "meta" FROM "Response" WHERE "formId" = ?`,
    [formId]
  );
  let n = 0;
  for (const r of rows) {
    try {
      if (JSON.parse(r.meta)?.email === email) n++;
    } catch {
      /* تجاهل الميتا غير الصالحة */
    }
  }
  return n;
}

// ============================ الزيارات (تحليلات الإكمال) ============================
export async function startVisit(formId: string) {
  const id = nanoid();
  await getDb().run(
    `INSERT INTO "Visit" ("id","formId","startedAt","lastQuestionId","responseId") VALUES (?,?,?,'','')`,
    [id, formId, now()]
  );
  return id;
}

export async function touchVisit(visitId: string, lastQuestionId: string) {
  await getDb().run(
    `UPDATE "Visit" SET "lastQuestionId" = ? WHERE "id" = ?`,
    [lastQuestionId, visitId]
  );
}

export async function completeVisit(visitId: string, responseId: string) {
  await getDb().run(
    `UPDATE "Visit" SET "completedAt" = ?, "responseId" = ? WHERE "id" = ?`,
    [now(), responseId, visitId]
  );
}

export interface VisitStats {
  started: number;
  completed: number;
  avgSeconds: number | null;
  // عدد من توقّف عند كل سؤال دون إكمال
  dropOff: { questionId: string; count: number }[];
}

export async function getVisitStats(formId: string): Promise<VisitStats> {
  const db = getDb();
  const totals = await db.first(
    `SELECT COUNT(*) as started,
            SUM(CASE WHEN "completedAt" IS NOT NULL THEN 1 ELSE 0 END) as completed
     FROM "Visit" WHERE "formId" = ?`,
    [formId]
  );
  const rows = await db.all(
    `SELECT "startedAt", "completedAt" FROM "Visit"
     WHERE "formId" = ? AND "completedAt" IS NOT NULL`,
    [formId]
  );
  let avgSeconds: number | null = null;
  if (rows.length) {
    let sum = 0;
    for (const r of rows)
      sum += (toDate(r.completedAt).getTime() - toDate(r.startedAt).getTime()) / 1000;
    avgSeconds = Math.max(0, Math.round(sum / rows.length));
  }
  const drop = await db.all(
    `SELECT "lastQuestionId" as questionId, COUNT(*) as c FROM "Visit"
     WHERE "formId" = ? AND "completedAt" IS NULL AND "lastQuestionId" != ''
     GROUP BY "lastQuestionId" ORDER BY c DESC`,
    [formId]
  );
  return {
    started: Number(totals?.started || 0),
    completed: Number(totals?.completed || 0),
    avgSeconds,
    dropOff: drop.map((r: any) => ({
      questionId: r.questionId,
      count: Number(r.c),
    })),
  };
}

// ============================ المسودّات (حفظ ومتابعة لاحقًا) ============================
export async function saveDraft(
  formId: string,
  answers: string,
  email: string,
  token?: string
): Promise<string> {
  const db = getDb();
  const ts = now();
  if (token) {
    const existing = await db.first(
      `SELECT "id" FROM "Draft" WHERE "id" = ? AND "formId" = ?`,
      [token, formId]
    );
    if (existing) {
      await db.run(
        `UPDATE "Draft" SET "answers" = ?, "email" = ?, "updatedAt" = ? WHERE "id" = ?`,
        [answers, email, ts, token]
      );
      return token;
    }
  }
  const id = token || nanoid(24);
  await db.run(
    `INSERT INTO "Draft" ("id","formId","answers","email","createdAt","updatedAt") VALUES (?,?,?,?,?,?)`,
    [id, formId, answers, email, ts, ts]
  );
  return id;
}

export async function getDraft(formId: string, token: string) {
  const r = await getDb().first(
    `SELECT * FROM "Draft" WHERE "id" = ? AND "formId" = ?`,
    [token, formId]
  );
  if (!r) return null;
  return { id: r.id as string, answers: r.answers as string, email: r.email as string };
}

export async function deleteDraft(token: string) {
  await getDb().run(`DELETE FROM "Draft" WHERE "id" = ?`, [token]);
}

// ============================ حصص الخيارات ============================
// عدد مرات اختيار كل قيمة لكل سؤال (لتطبيق الحصص وإظهار المتاح)
export async function getOptionCounts(
  formId: string,
  questionIds: string[]
): Promise<Record<string, Record<string, number>>> {
  if (!questionIds.length) return {};
  const db = getDb();
  const ph = questionIds.map(() => "?").join(",");
  // نقيّد بالنموذج أيضًا حتى لا تُحتسب إجابات من نموذج آخر بأي حال
  const rows = await db.all(
    `SELECT a."questionId", a."value" FROM "Answer" a
     JOIN "Question" q ON q."id" = a."questionId"
     WHERE a."questionId" IN (${ph}) AND q."formId" = ?`,
    [...questionIds, formId]
  );
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const bucket = (out[r.questionId] ??= {});
    let v: any;
    try {
      v = JSON.parse(r.value);
    } catch {
      v = r.value;
    }
    for (const item of Array.isArray(v) ? v : [v]) {
      const key = String(item ?? "");
      if (!key) continue;
      bucket[key] = (bucket[key] || 0) + 1;
    }
  }
  return out;
}

// نموذج مع كامل الأسئلة والردود وإجاباتها ومشروعه (لصفحة الردود والتصدير)
export async function getFormWithResponses(id: string) {
  const db = getDb();
  const f = await db.first(`SELECT * FROM "Form" WHERE "id" = ?`, [id]);
  if (!f) return null;
  const qs = await db.all(
    `SELECT * FROM "Question" WHERE "formId" = ? ORDER BY "order" ASC`,
    [id]
  );
  const resp = await db.all(
    `SELECT * FROM "Response" WHERE "formId" = ? ORDER BY "submittedAt" DESC`,
    [id]
  );
  const answers = await db.all(
    `SELECT * FROM "Answer" WHERE "responseId" IN (SELECT "id" FROM "Response" WHERE "formId" = ?)`,
    [id]
  );
  const byResp = new Map<string, any[]>();
  for (const a of answers) {
    const list = byResp.get(a.responseId) ?? [];
    list.push(mapAnswer(a));
    byResp.set(a.responseId, list);
  }
  const project = await db.first(`SELECT * FROM "Project" WHERE "id" = ?`, [
    f.projectId,
  ]);
  return {
    ...mapForm(f),
    project: project ? mapProject(project) : null,
    questions: qs.map(mapQuestion),
    responses: resp.map((r: any) => ({
      ...mapResponse(r),
      answers: byResp.get(r.id) ?? [],
    })),
  };
}

export async function getResponseWithAnswers(id: string) {
  const db = getDb();
  const r = await db.first(`SELECT * FROM "Response" WHERE "id" = ?`, [id]);
  if (!r) return null;
  const answers = await db.all(
    `SELECT * FROM "Answer" WHERE "responseId" = ?`,
    [id]
  );
  return { ...mapResponse(r), answers: answers.map(mapAnswer) };
}
