# naf-governance — موقوف بانتظار قرار

نُزِّل عنصر `naf-governance#v1.1.1` من السجلّ، وهذان الملفان **لم يُثبَّتا في مواضعهما**:

- `release.yml` → كان سيوضع في `.github/workflows/`
- `release.mjs` → كان سيوضع في `.github/scripts/`

## السبب

سير الإصدار مكتوب لمستودع السجلّ نفسه، لا للمنصات. خطواته:

```
npx shadcn registry validate ./registry.json
npx shadcn build      →  ثم يقارن ناتج public/r
```

ولا يوجد في `naf-forms` أيٌّ من `registry.json` أو `public/r` أو تبعية `shadcn`.
تثبيته في `.github/workflows/` يجعله **يفشل عند كل دمج في `main`**، ويزاحم
سير النشر القائم `deploy.yml`.

## ما ثُبّت فعلًا من الحوكمة

`.gitmessage` — قالب رسائل الالتزام (Conventional Commits). لتفعيله:

```bash
git config commit.template .gitmessage
```

## القرار المطلوب

أحد ثلاثة:
1. **إبقاؤه موقوفًا** — الحوكمة تُطبَّق في `naf-ui` فقط (هذا المتوقّع من نصّ `CLAUDE.md §9`).
2. **تثبيته بعد تعديله** ليُسقط خطوات التحقق من السجلّ ويصدر وسومًا لـ `naf-forms`.
3. **تثبيته كما هو** — مع العلم أن كل دمج في `main` سيُظهر فشلًا في Actions.
