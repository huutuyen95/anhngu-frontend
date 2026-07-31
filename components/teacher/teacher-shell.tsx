"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  School,
  FileText,
  BookA,
  Files,
  ClipboardList,
  PenLine,
  Bell,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Users;
  ready?: boolean;
  badge?: number;
};

// IA đã chốt (Sprint 2): đúng 8 mục, KHÔNG có "Báo cáo" riêng (Báo cáo là tab trong lớp).
const NAV: NavItem[] = [
  { label: "Tổng quan", href: "/teacher", icon: LayoutDashboard, ready: true },
  { label: "Học sinh", href: "/teacher/students", icon: Users, ready: true },
  { label: "Lớp học", href: "/teacher/classes", icon: School, ready: true },
  { label: "Đề thi", href: "/teacher/tests", icon: FileText },
  { label: "Từ vựng", href: "/teacher/vocabulary", icon: BookA, ready: true },
  { label: "Tài liệu & Bài giảng", href: "/teacher/documents", icon: Files },
  { label: "Kết quả làm bài", href: "/teacher/results", icon: ClipboardList },
  { label: "Chấm bài", href: "/teacher/grading", icon: PenLine, badge: 0 },
];

export function TeacherShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const active =
    NAV.filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/teacher";

  async function handleLogout() {
    await logout();
    router.replace("/teacher/login");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-border bg-surface xl:w-60">
        <div className="flex h-14 items-center gap-2 px-3 xl:px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand font-display text-sm font-extrabold text-white">
            AU
          </span>
          <span className="hidden font-display text-base font-bold text-text xl:inline">
            Mrs Uyên
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 xl:p-3">
          {NAV.map((item) => {
            const isActive = active === item.href;
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="size-5 shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto hidden rounded-full bg-danger px-1.5 text-xs font-semibold text-white xl:inline">
                    {item.badge}
                  </span>
                ) : null}
              </>
            );
            const base =
              "relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors xl:px-3";
            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  aria-disabled
                  title="Sắp có"
                  className={cn(base, "cursor-not-allowed text-text-muted")}
                >
                  {content}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  base,
                  isActive
                    ? "bg-brand-soft text-brand before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-brand"
                    : "text-text-secondary hover:bg-surface-alt hover:text-text"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="m-2 flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger xl:m-3 xl:px-3"
        >
          <LogOut className="size-5 shrink-0" />
          <span className="hidden xl:inline">Đăng xuất</span>
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-6 backdrop-blur">
          <span className="font-display text-base font-bold text-text">
            {NAV.find((n) => n.href === active)?.label ?? "Tổng quan"}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Thông báo"
              className="relative flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-alt"
            >
              <Bell className="size-5" />
            </button>
            <span className="text-sm font-medium text-text">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 p-6 xl:p-7">{children}</main>
      </div>
    </div>
  );
}
