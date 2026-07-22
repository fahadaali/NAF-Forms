-- بذر القوالب الجاهزة (idempotent). يُشغَّل بعد 0001/0002.
INSERT OR IGNORE INTO "Project" ("id","name","description","color","createdAt","updatedAt")
VALUES ('system-templates', 'قوالب النظام', 'قوالب جاهزة للاستخدام السريع', '#64748b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "Form" ("id","slug","projectId","title","description","type","status","settings","isTemplate","createdAt","updatedAt")
VALUES ('tplf_tpl-job-application', 'tpl-job-application', 'system-templates', 'نموذج تقديم وظيفي (رفع سيرة ذاتية)', 'استقبل طلبات التوظيف مع البيانات الأساسية للمتقدم ورفع السيرة الذاتية.', 'JOB', 'PUBLISHED', '{}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_0', 'tplf_tpl-job-application', 0, 'SHORT_TEXT', 'الاسم الكامل', '', 1, '{}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_1', 'tplf_tpl-job-application', 1, 'EMAIL', 'البريد الإلكتروني', '', 1, '{}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_2', 'tplf_tpl-job-application', 2, 'PHONE', 'رقم الجوال', '', 1, '{}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_3', 'tplf_tpl-job-application', 3, 'DROPDOWN', 'الوظيفة المتقدَّم لها', '', 1, '{"options":["مطوّر برمجيات","مصمم","أخصائي تسويق","محاسب","أخرى"]}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_4', 'tplf_tpl-job-application', 4, 'MULTIPLE_CHOICE', 'سنوات الخبرة', '', 1, '{"options":["أقل من سنة","1-3 سنوات","3-5 سنوات","أكثر من 5 سنوات"]}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_5', 'tplf_tpl-job-application', 5, 'ADDRESS', 'عنوان السكن', '', 0, '{}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_6', 'tplf_tpl-job-application', 6, 'FILE', 'السيرة الذاتية (CV)', '', 1, '{"accept":".pdf,.doc,.docx","maxSizeMB":10}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-job-application_7', 'tplf_tpl-job-application', 7, 'PARAGRAPH', 'نبذة تعريفية عنك', '', 0, '{}', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "Form" ("id","slug","projectId","title","description","type","status","settings","isTemplate","createdAt","updatedAt")
VALUES ('tplf_tpl-quiz', 'tpl-quiz', 'system-templates', 'اختبار قصير', 'اختبار من أسئلة اختيار من متعدد مع تصحيح تلقائي واحتساب الدرجة.', 'EXAM', 'PUBLISHED', '{}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quiz_0', 'tplf_tpl-quiz', 0, 'SHORT_TEXT', 'اسم الطالب', '', 1, '{}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quiz_1', 'tplf_tpl-quiz', 1, 'MULTIPLE_CHOICE', 'ما هي عاصمة المملكة العربية السعودية؟', '', 1, '{"options":["جدة","الرياض","الدمام","مكة المكرمة"],"correctAnswer":"الرياض","points":1}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quiz_2', 'tplf_tpl-quiz', 2, 'MULTIPLE_CHOICE', 'كم عدد أركان الإسلام؟', '', 1, '{"options":["ثلاثة","أربعة","خمسة","ستة"],"correctAnswer":"خمسة","points":1}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quiz_3', 'tplf_tpl-quiz', 3, 'CHECKBOXES', 'أيٌّ مما يلي من الفصول الأربعة؟', '', 1, '{"options":["الربيع","الصيف","المطر","الخريف"],"correctAnswer":["الربيع","الصيف","الخريف"],"points":2}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quiz_4', 'tplf_tpl-quiz', 4, 'SHORT_TEXT', 'ناتج 12 × 8 = ؟', '', 1, '{"correctAnswer":"96","points":1}', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "Form" ("id","slug","projectId","title","description","type","status","settings","isTemplate","createdAt","updatedAt")
VALUES ('tplf_tpl-employee-satisfaction', 'tpl-employee-satisfaction', 'system-templates', 'استبيان رضا الموظفين', 'قِس مستوى رضا الموظفين عبر مقاييس تقييم متنوعة وأسئلة مفتوحة.', 'SURVEY', 'PUBLISHED', '{}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-employee-satisfaction_0', 'tplf_tpl-employee-satisfaction', 0, 'SECTION', 'بيئة العمل', 'قيّم العبارات التالية حسب درجة موافقتك.', 0, '{}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-employee-satisfaction_1', 'tplf_tpl-employee-satisfaction', 1, 'LINEAR_SCALE', 'أشعر بالرضا عن بيئة عملي بشكل عام', '', 1, '{"min":1,"max":5,"minLabel":"غير موافق بشدة","maxLabel":"موافق بشدة"}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-employee-satisfaction_2', 'tplf_tpl-employee-satisfaction', 2, 'GRID', 'قيّم الجوانب التالية', '', 1, '{"rows":["التواصل الداخلي","فرص التطوير","التوازن بين العمل والحياة","التقدير والتحفيز"],"cols":["ضعيف","مقبول","جيد","ممتاز"],"multi":false}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-employee-satisfaction_3', 'tplf_tpl-employee-satisfaction', 3, 'RATING', 'تقييمك العام لإدارتك المباشرة', '', 1, '{"max":5}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-employee-satisfaction_4', 'tplf_tpl-employee-satisfaction', 4, 'MULTIPLE_CHOICE', 'هل توصي بالعمل في المنشأة لأصدقائك؟', '', 1, '{"options":["نعم بالتأكيد","ربما","لا"]}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-employee-satisfaction_5', 'tplf_tpl-employee-satisfaction', 5, 'PARAGRAPH', 'اقتراحات لتحسين بيئة العمل', '', 0, '{}', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "Form" ("id","slug","projectId","title","description","type","status","settings","isTemplate","createdAt","updatedAt")
VALUES ('tplf_tpl-quick-poll', 'tpl-quick-poll', 'system-templates', 'استطلاع رأي سريع', 'استطلاع من سؤال أو سؤالين لجمع رأي سريع من الجمهور.', 'SURVEY', 'PUBLISHED', '{}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quick-poll_0', 'tplf_tpl-quick-poll', 0, 'MULTIPLE_CHOICE', 'ما هو الوقت الأنسب لك لحضور الفعالية؟', '', 1, '{"options":["صباحًا","ظهرًا","مساءً"],"allowOther":true}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quick-poll_1', 'tplf_tpl-quick-poll', 1, 'RATING', 'ما مدى اهتمامك بالحضور؟', '', 0, '{"max":5}', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "Question" ("id","formId","order","type","label","description","required","config","createdAt")
VALUES ('tplq_tpl-quick-poll_2', 'tplf_tpl-quick-poll', 2, 'LOCATION', 'موقعك المفضل للفعالية (اختياري)', '', 0, '{}', CURRENT_TIMESTAMP);
