# قرارات تنتظر التسجيل في `fahadaali/naf-ui`

القاعدة ٠: **السجلّ يسبق المنصة.** كل ما في هذا المجلد **مطبَّق في
`naf-forms` وغير مسجَّل** — أي أنه انحراف بالتعريف، حتى لو كان القرار صحيحًا،
لأن المنصة التالية لن تجده.

**السبب:** الوصول إلى `fahadaali/naf-ui` في جلسة الربط كان **للقراءة فقط**
(`git push` يُرجع 403). طلب صلاحية الكتابة يحتاج موافقتك في العميل.

---

## الملفات

| الملف | يُلحَق بـ | المحتوى |
|---|---|---|
| `naf-icons.append.md` | `naf-icons.md` | قسم «أنواع حقول النماذج» (٢٦ مفهومًا) + ١٧ مفهومًا تشغيليًا + تصحيح غموض «قواعد القلب» |
| `naf-terms.append.md` | `naf-terms.md` | قسم «مصطلحات النماذج والاستبيانات» (٣ أنواع نماذج + ٢٤ نوع حقل + ١٨ مفهومًا) + دالة `bidi()` لـ`naf-format` |
| `naf-theme.append.css` | `naf-theme.css` | رمز طبقة التعتيم `--overlay`، ومقاسا الرسم التوضيحي |

---

## طريقة التطبيق

```bash
cd /path/to/naf-ui
git checkout -b feat/form-platform-vocabulary

cat /path/to/naf-forms/audit/registry-pending/naf-icons.append.md >> naf-icons.md
cat /path/to/naf-forms/audit/registry-pending/naf-terms.append.md >> naf-terms.md
# ملف الثيم يُدمج يدويًا: الكتل الثلاث تدخل في مواضعها
#   :root  ·  .dark  ·  @theme inline

git add -A
git commit -m "feat: أنواع حقول النماذج ومصطلحاتها ورمز طبقة التعتيم"
git push -u origin feat/form-platform-vocabulary
```

ثم يُدمج في `main`، فيتولّى سير الإصدار التلقائي رفع الرقم إلى **v1.2.0**
(`feat:` = زيادة ثانوية). **لا تُنشئ الوسم يدويًا** — القاعدة ٩.

---

## بعد صدور v1.2.0

في `naf-forms`:

1. يُرفع `.naf-version` إلى `v1.2.0`
2. يُعاد سحب `naf-theme.css` و`naf-format` من الإصدار الجديد
3. تُستبدل ٣ خلفيات حوار `bg-black/40` بـ`bg-overlay`
4. تُستبدل ٩ مقاسات رسم توضيحي بـ`size-illustration-sm` و`-lg`
5. تُستورد `bidi()` من `naf-format` بدل النسخة المحلية في `lib/utils.ts`

عندها تُغلق البنود ⚠️ في `audit/report.md §٤`.
