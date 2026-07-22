import { PrismaClient } from "@prisma/client";
import { hashPassword, DEFAULT_PASSWORD } from "../src/lib/auth";

const prisma = new PrismaClient();

const FIRST_ADMIN_EMAIL =
  process.env.FIRST_ADMIN_EMAIL || "fahad2ao@gmail.com";

const TEMPLATES_PROJECT_ID = "system-templates";

interface Q {
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  config?: Record<string, unknown>;
}

interface Template {
  slug: string;
  title: string;
  type: string;
  description: string;
  questions: Q[];
}

const TEMPLATES: Template[] = [
  {
    slug: "tpl-job-application",
    title: "نموذج تقديم وظيفي (رفع سيرة ذاتية)",
    type: "JOB",
    description:
      "استقبل طلبات التوظيف مع البيانات الأساسية للمتقدم ورفع السيرة الذاتية.",
    questions: [
      { type: "SHORT_TEXT", label: "الاسم الكامل", required: true },
      { type: "EMAIL", label: "البريد الإلكتروني", required: true },
      { type: "PHONE", label: "رقم الجوال", required: true },
      {
        type: "DROPDOWN",
        label: "الوظيفة المتقدَّم لها",
        required: true,
        config: { options: ["مطوّر برمجيات", "مصمم", "أخصائي تسويق", "محاسب", "أخرى"] },
      },
      {
        type: "MULTIPLE_CHOICE",
        label: "سنوات الخبرة",
        required: true,
        config: { options: ["أقل من سنة", "1-3 سنوات", "3-5 سنوات", "أكثر من 5 سنوات"] },
      },
      { type: "ADDRESS", label: "عنوان السكن" },
      {
        type: "FILE",
        label: "السيرة الذاتية (CV)",
        required: true,
        config: { accept: ".pdf,.doc,.docx", maxSizeMB: 10 },
      },
      { type: "PARAGRAPH", label: "نبذة تعريفية عنك" },
    ],
  },
  {
    slug: "tpl-quiz",
    title: "اختبار قصير",
    type: "EXAM",
    description: "اختبار من أسئلة اختيار من متعدد مع تصحيح تلقائي واحتساب الدرجة.",
    questions: [
      { type: "SHORT_TEXT", label: "اسم الطالب", required: true },
      {
        type: "MULTIPLE_CHOICE",
        label: "ما هي عاصمة المملكة العربية السعودية؟",
        required: true,
        config: {
          options: ["جدة", "الرياض", "الدمام", "مكة المكرمة"],
          correctAnswer: "الرياض",
          points: 1,
        },
      },
      {
        type: "MULTIPLE_CHOICE",
        label: "كم عدد أركان الإسلام؟",
        required: true,
        config: { options: ["ثلاثة", "أربعة", "خمسة", "ستة"], correctAnswer: "خمسة", points: 1 },
      },
      {
        type: "CHECKBOXES",
        label: "أيٌّ مما يلي من الفصول الأربعة؟",
        required: true,
        config: {
          options: ["الربيع", "الصيف", "المطر", "الخريف"],
          correctAnswer: ["الربيع", "الصيف", "الخريف"],
          points: 2,
        },
      },
      {
        type: "SHORT_TEXT",
        label: "ناتج 12 × 8 = ؟",
        required: true,
        config: { correctAnswer: "96", points: 1 },
      },
    ],
  },
  {
    slug: "tpl-employee-satisfaction",
    title: "استبيان رضا الموظفين",
    type: "SURVEY",
    description: "قِس مستوى رضا الموظفين عبر مقاييس تقييم متنوعة وأسئلة مفتوحة.",
    questions: [
      {
        type: "SECTION",
        label: "بيئة العمل",
        description: "قيّم العبارات التالية حسب درجة موافقتك.",
      },
      {
        type: "LINEAR_SCALE",
        label: "أشعر بالرضا عن بيئة عملي بشكل عام",
        required: true,
        config: { min: 1, max: 5, minLabel: "غير موافق بشدة", maxLabel: "موافق بشدة" },
      },
      {
        type: "GRID",
        label: "قيّم الجوانب التالية",
        required: true,
        config: {
          rows: ["التواصل الداخلي", "فرص التطوير", "التوازن بين العمل والحياة", "التقدير والتحفيز"],
          cols: ["ضعيف", "مقبول", "جيد", "ممتاز"],
          multi: false,
        },
      },
      { type: "RATING", label: "تقييمك العام لإدارتك المباشرة", required: true, config: { max: 5 } },
      {
        type: "MULTIPLE_CHOICE",
        label: "هل توصي بالعمل في المنشأة لأصدقائك؟",
        required: true,
        config: { options: ["نعم بالتأكيد", "ربما", "لا"] },
      },
      { type: "PARAGRAPH", label: "اقتراحات لتحسين بيئة العمل" },
    ],
  },
  {
    slug: "tpl-quick-poll",
    title: "استطلاع رأي سريع",
    type: "SURVEY",
    description: "استطلاع من سؤال أو سؤالين لجمع رأي سريع من الجمهور.",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        label: "ما هو الوقت الأنسب لك لحضور الفعالية؟",
        required: true,
        config: { options: ["صباحًا", "ظهرًا", "مساءً"], allowOther: true },
      },
      { type: "RATING", label: "ما مدى اهتمامك بالحضور؟", config: { max: 5 } },
      { type: "LOCATION", label: "موقعك المفضل للفعالية (اختياري)" },
    ],
  },
];

async function main() {
  // أول حساب مسؤول: كلمة المرور الافتراضية 1234 مع إلزام تغييرها أول دخول
  const existingAdmin = await prisma.user.findUnique({
    where: { email: FIRST_ADMIN_EMAIL },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: FIRST_ADMIN_EMAIL,
        role: "admin",
        passwordHash: await hashPassword(DEFAULT_PASSWORD),
        mustChangePassword: true,
      },
    });
    console.log(`✓ حساب المسؤول الأول: ${FIRST_ADMIN_EMAIL} (كلمة المرور 1234)`);
  }

  // مشروع مخفي يحتضن القوالب الجاهزة
  await prisma.project.upsert({
    where: { id: TEMPLATES_PROJECT_ID },
    update: {},
    create: {
      id: TEMPLATES_PROJECT_ID,
      name: "قوالب النظام",
      description: "قوالب جاهزة للاستخدام السريع",
      color: "#64748b",
    },
  });

  for (const t of TEMPLATES) {
    const existing = await prisma.form.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await prisma.form.delete({ where: { id: existing.id } });
    }
    await prisma.form.create({
      data: {
        slug: t.slug,
        projectId: TEMPLATES_PROJECT_ID,
        title: t.title,
        description: t.description,
        type: t.type,
        status: "PUBLISHED",
        isTemplate: true,
        questions: {
          create: t.questions.map((q, i) => ({
            order: i,
            type: q.type,
            label: q.label,
            description: q.description || "",
            required: !!q.required,
            config: JSON.stringify(q.config || {}),
          })),
        },
      },
    });
    console.log(`✓ قالب: ${t.title}`);
  }
  console.log("تم تحضير القوالب الجاهزة.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
