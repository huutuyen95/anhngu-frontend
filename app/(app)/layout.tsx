"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/missions", label: "Nhiệm vụ" },
  { href: "/classroom", label: "Lớp học" },
  { href: "/library", label: "Thư viện" },
  { href: "/reports", label: "Báo cáo" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Chưa xác định phiên hoặc chưa đăng nhập: chưa render nội dung khu riêng tư
  if (loading || !user) {
    return null;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200 pt-4">
          <p className="mb-2 truncate text-sm font-medium text-slate-900">
            {user.name}
          </p>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
