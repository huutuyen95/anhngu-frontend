"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ListChecks, School, Library, BarChart3, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: typeof Library; ready?: boolean };

const NAV: NavItem[] = [
  { label: "Nhiệm vụ", href: "/missions", icon: ListChecks, ready: true },
  { label: "Lớp học", href: "/classes", icon: School },
  { label: "Thư viện", href: "/library", icon: Library, ready: true },
  { label: "Báo cáo", href: "/reports", icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand font-display text-sm font-extrabold text-white">
            AU
          </span>
          <span className="font-display text-base font-bold text-text">Mrs Uyên</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const activ = isActive(pathname, item.href);
            const cls =
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
            if (!item.ready)
              return (
                <span
                  key={item.href}
                  title="Sắp có"
                  className={cn(cls, "cursor-not-allowed text-text-muted")}
                >
                  <Icon className="size-5" /> {item.label}
                </span>
              );
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activ ? "page" : undefined}
                className={cn(
                  cls,
                  activ
                    ? "bg-brand-soft text-brand"
                    : "text-text-secondary hover:bg-surface-alt hover:text-text"
                )}
              >
                <Icon className="size-5" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut className="size-5" /> Đăng xuất
        </button>
      </aside>

      {/* Nội dung */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
          <span className="font-display text-base font-bold text-text md:hidden">
            Mrs Uyên
          </span>
          <span className="hidden text-sm text-text-secondary md:block">
            Xin chào, <span className="font-semibold text-text">{user?.name}</span>
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[60px] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const activ = isActive(pathname, item.href);
          const inner = (
            <span
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                activ ? "text-brand" : "text-text-muted"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </span>
          );
          return item.ready ? (
            <Link key={item.href} href={item.href} className="flex flex-1">
              {inner}
            </Link>
          ) : (
            <span key={item.href} className="flex flex-1 cursor-not-allowed">
              {inner}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
