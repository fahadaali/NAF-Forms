// طبقة الوصول إلى البيانات (Repository) فوق D1 الأصلي / better-sqlite3.
// تُعيد الدوال كائنات بنفس شكل نتائج Prisma السابقة (علاقات + عدّادات + تواريخ Date)
// حتى تبقى مواضع الاستدعاء في التطبيق كما هي تقريبًا.
import { nanoid } from "nanoid";
import { getDb, type Db } from "./db";

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
    createdAt: toDate(r.createdAt),
  };
}
function mapProject(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
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
  data: { role?: string; passwordHash?: string; mustChangePassword?: boolean }
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
export async function listProjects() {
  const db = getDb();
  const rows = await db.all(
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
  const withCounts = await Promise.all(
    forms.map(async (f: any) => {
      const rc = await db.first(
        `SELECT COUNT(*) as c FROM "Response" WHERE "formId" = ?`,
        [f.id]
      );
      const qc = await db.first(
        `SELECT COUNT(*) as c FROM "Question" WHERE "formId" = ?`,
        [f.id]
      );
      return {
        ...mapForm(f),
        _count: {
          responses: Number(rc?.c || 0),
          questions: Number(qc?.c || 0),
        },
      };
    })
  );
  return { ...mapProject(p), forms: withCounts };
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
}) {
  const db = getDb();
  const id = nanoid();
  const ts = now();
  await db.run(
    `INSERT INTO "Project" ("id","name","description","color","createdAt","updatedAt") VALUES (?,?,?,?,?,?)`,
    [id, data.name, data.description ?? "", data.color ?? "#1c59f5", ts, ts]
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
    [data.id, data.name, data.description ?? "", data.color ?? "#1c59f5", ts, ts]
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
  },
  questions: QuestionInput[] = []
) {
  const db = getDb();
  const id = nanoid();
  const ts = now();
  await db.run(
    `INSERT INTO "Form" ("id","slug","projectId","title","description","type","status","settings","isTemplate","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
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
  }
) {
  const db = getDb();
  const sets: string[] = [];
  const vals: any[] = [];
  for (const k of ["title", "description", "type", "status", "settings"] as const) {
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
  return Promise.all(
    rows.map(async (f: any) => {
      const qc = await db.first(
        `SELECT COUNT(*) as c FROM "Question" WHERE "formId" = ?`,
        [f.id]
      );
      return { ...mapForm(f), _count: { questions: Number(qc?.c || 0) } };
    })
  );
}

export async function countForms(isTemplate: boolean) {
  const r = await getDb().first(
    `SELECT COUNT(*) as c FROM "Form" WHERE "isTemplate" = ?`,
    [isTemplate ? 1 : 0]
  );
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
