import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted px-4 text-center">
      <div>
        <div className="mb-4 flex justify-center text-muted-foreground">
          <Icon name="search" className="h-16 w-16" />
        </div>
        <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
        <p className="mt-2 text-muted-foreground">
          تعذّر العثور على ما تبحث عنه — ربما حُذف النموذج أو المشروع.
        </p>
        <Link href="/" className={cn(buttonVariants(), "mt-6")}>
          رجوع للرئيسية
        </Link>
      </div>
    </div>
  );
}
