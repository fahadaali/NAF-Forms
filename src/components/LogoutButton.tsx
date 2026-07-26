"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
    >
      <Icon name="logout" className="h-4 w-4" /> خروج
    </button>
  );
}
