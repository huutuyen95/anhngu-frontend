"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppFooter } from "@/components/layout/app-footer";

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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader onLogout={handleLogout} />

      <div className="flex flex-1 pt-16">
        <AppSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>

      <AppFooter />
    </div>
  );
}
