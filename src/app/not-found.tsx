import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div>
        <div className="mb-3 text-6xl">🔍</div>
        <h1 className="text-2xl font-extrabold">الصفحة غير موجودة</h1>
        <p className="mt-2 text-slate-500">
          تعذّر العثور على ما تبحث عنه — ربما حُذف النموذج أو المشروع.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
