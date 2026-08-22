"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Newspaper,
  Settings,
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

// Không có "Báo cáo" riêng (Báo cáo là tab trong lớp).
const NAV: NavItem[] = [
  { label: "Tổng quan", href: "/teacher", icon: LayoutDashboard, ready: true },
  { label: "Học sinh", href: "/teacher/students", icon: Users, ready: true },
  { label: "Lớp học", href: "/teacher/classes", icon: School, ready: true },
  { label: "Đề thi", href: "/teacher/tests", icon: FileText, ready: true },
  { label: "Từ vựng", href: "/teacher/vocabulary", icon: BookA, ready: true },
  { label: "Tài liệu & Bài giảng", href: "/teacher/documents", icon: Files, ready: true },
  { label: "Bài viết", href: "/teacher/articles", icon: Newspaper, ready: true },
  { label: "Kết quả làm bài", href: "/teacher/results", icon: ClipboardList, ready: true },
];

export function TeacherShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // "Cài đặt" chỉ hiện với super admin, đặt ở CUỐI danh sách.
  const nav = user?.is_super_admin
    ? [...NAV, { label: "Cài đặt", href: "/teacher/settings", icon: Settings, ready: true }]
    : NAV;

  const active =
    nav.filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/teacher";

  // Pill chỉ báo mục đang chọn — trượt mượt từ mục A sang B (đo vị trí item active).
  // Lần đo đầu (mới vào trang) đặt chỗ tức thì; đổi mục sau đó mới bật transition để trượt.
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const firstRun = useRef(true);
  const [indicator, setIndicator] = useState<{ top: number; height: number; animate: boolean } | null>(null);
  useEffect(() => {
    const el = itemRefs.current[active];
    if (!el) return;
    setIndicator({ top: el.offsetTop, height: el.offsetHeight, animate: !firstRun.current });
    firstRun.current = false;
  }, [active, nav.length]);

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

        <nav className="relative flex flex-1 flex-col gap-1 overflow-y-auto p-2 xl:p-3">
          {/* Pill trượt: nằm sau các mục (link vẽ đè lên) */}
          {indicator && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-2 top-0 rounded-xl bg-brand-soft xl:inset-x-3",
                indicator.animate && "transition-[transform,height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              )}
              style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height }}
            />
          )}
          {nav.map((item) => {
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
              "relative z-10 flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors xl:px-3";
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
                ref={(el) => { itemRefs.current[item.href] = el; }}
                className={cn(
                  base,
                  isActive
                    ? "text-brand"
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
            {nav.find((n) => n.href === active)?.label ?? "Tổng quan"}
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
