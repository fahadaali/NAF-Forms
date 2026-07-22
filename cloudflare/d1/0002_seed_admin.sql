-- بذر أول حساب مسؤول: fahad2ao@gmail.com بكلمة المرور الافتراضية 1234
-- (يُطلب منه تعيين كلمة مرور جديدة عند أول دخول)
INSERT OR IGNORE INTO "User" ("id", "email", "role", "passwordHash", "mustChangePassword", "createdAt")
VALUES (
  'admin_seed_1',
  'fahad2ao@gmail.com',
  'admin',
  'pbkdf2$100000$dWUnNRjLNfrYGHKGc7hD3g$LuuFBkiL-rQAiEO_awfTQ80HzFAqr-x5vxLTae3b_Gc',
  1,
  CURRENT_TIMESTAMP
);
