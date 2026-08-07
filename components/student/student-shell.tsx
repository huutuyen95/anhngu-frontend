"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ListChecks, School, Library, BarChart3, Search, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: typeof Library; ready?: boolean; alsoActive?: string[] };

const NAV: NavItem[] = [
  { label: "Nhiệm vụ", href: "/missions", icon: ListChecks, ready: true },
  { label: "Lớp của em", href: "/classes", icon: School },
  { label: "Thư viện", href: "/library", icon: Library, ready: true, alsoActive: ["/tests", "/results"] },
  { label: "Báo cáo", href: "/reports", icon: BarChart3 },
];

function matchActive(pathname: string, item: NavItem) {
  const all = [item.href, ...(item.alsoActive ?? [])];
  return all.some((h) => pathname === h || pathname.startsWith(h + "/"));
}

const SCREEN_TITLE: Record<string, string> = {
  "/missions": "Nhiệm vụ", "/library": "Thư viện", "/tests": "Đề thi", "/classes": "Lớp của em", "/reports": "Báo cáo",
};

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  // Ẩn bottom nav khi bàn phím mở (visualViewport co lại) để không che input.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKbOpen(vv.height < window.innerHeight - 120);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initial = (user?.name ?? "?").charAt(0).toUpperCase();
  const screenTitle = SCREEN_TITLE[Object.keys(SCREEN_TITLE).find((k) => pathname.startsWith(k)) ?? ""] ?? "";

  return (
    <div className="organic flex min-h-screen flex-col bg-bg">
      {/* ── Header desktop (menu ngang) ── */}
      <header
        className="sticky top-0 z-40 hidden h-[76px] items-center gap-2 border-b border-divider px-8 md:flex"
        style={{ background: "color-mix(in srgb, var(--color-bg) 86%, #fff)" }}
      >
        <Link href="/missions" className="flex items-center gap-2.5">
          <span className="flex size-[42px] items-center justify-center rounded-full bg-accent font-display text-base font-extrabold text-bg">AU</span>
          <span className="leading-tight">
            <span className="block font-display text-[19px] font-bold text-text">Anh ngữ Mrs Uyên</span>
            <span className="block text-xs text-neutral-600">{user?.name ?? "Học viên"}</span>
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const activ = matchActive(pathname, item);
            const base = "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors";
            if (!item.ready)
              return (
                <span key={item.href} title="Sắp có" className={cn(base, "cursor-not-allowed font-semibold text-neutral-400")}>
                  <Icon className="size-[18px]" strokeWidth={2.75} /> {item.label}
                </span>
              );
            return (
              <Link key={item.href} href={item.href} aria-current={activ ? "page" : undefined}
                className={cn(base, activ ? "bg-accent-200 font-bold text-accent-800" : "font-semibold text-neutral-700 hover:bg-neutral-200")}>
                <Icon className="size-[18px]" strokeWidth={2.75} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex h-11 w-[280px] items-center gap-2 rounded-full border border-divider bg-neutral-100 px-4">
            <Search className="size-[18px] shrink-0 text-neutral-500" strokeWidth={2.75} />
            <input placeholder="Tìm đề, từ vựng…" className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-neutral-500" />
            <span className="rounded-md border border-divider px-1.5 py-0.5 text-[11px] font-semibold text-neutral-500">⌘K</span>
          </label>
          <button aria-label="Thông báo" className="btn btn-secondary btn-icon relative">
            <Bell className="size-[18px]" strokeWidth={2.75} />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-accent" />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="Tài khoản"
              className="flex size-[42px] items-center justify-center rounded-full bg-accent-2-200 font-display text-sm font-bold text-accent-2-800">{initial}</button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl border border-divider bg-neutral-100 py-1 elev-md">
                  <div className="px-4 py-2 text-sm">
                    <p className="font-semibold text-text">{user?.name}</p>
                    <p className="truncate text-xs text-neutral-600">{user?.email}</p>
                  </div>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200">
                    <LogOut className="size-4" strokeWidth={2.75} /> Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Header mobile (60px) ── */}
      <header
        className="sticky top-0 z-40 flex h-[60px] items-center gap-2 border-b border-divider px-4 md:hidden"
        style={{ background: "color-mix(in srgb, var(--color-bg) 86%, #fff)" }}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-accent font-display text-sm font-extrabold text-bg">AU</span>
        <span className="font-display text-base font-bold text-text">{screenTitle || "Anh ngữ Mrs Uyên"}</span>
        <div className="ml-auto flex items-center gap-2">
          <button aria-label="Tìm kiếm" className="btn btn-secondary btn-icon size-10"><Search className="size-[18px]" strokeWidth={2.75} /></button>
          <button aria-label="Thông báo" className="btn btn-secondary btn-icon relative size-10"><Bell className="size-[18px]" strokeWidth={2.75} /><span className="absolute right-2 top-2 size-2 rounded-full bg-accent" /></button>
          <button onClick={handleLogout} aria-label="Đăng xuất" className="flex size-10 items-center justify-center rounded-full bg-accent-2-200 font-display text-sm font-bold text-accent-2-800">{initial}</button>
        </div>
      </header>

      {/* ── Nội dung ── */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-[calc(66px+env(safe-area-inset-bottom)+16px)] pt-6 md:px-8 md:pb-12 md:pt-10">
        {children}
      </main>

      <StudentFooter />

      {/* ── Bottom nav mobile ── */}
      {!kbOpen && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[66px] items-stretch border-t border-divider bg-neutral-100 pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const activ = matchActive(pathname, item);
            const inner = (
              <span className={cn("flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold", activ ? "text-accent-800" : "text-neutral-500")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", activ && "bg-accent-200")}>
                  <Icon className="size-[18px]" strokeWidth={2.75} />
                </span>
                {item.label}
              </span>
            );
            return item.ready ? (
              <Link key={item.href} href={item.href} className="flex flex-1">{inner}</Link>
            ) : (
              <span key={item.href} className="flex flex-1 cursor-not-allowed opacity-60">{inner}</span>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function StudentFooter() {
  return (
    <footer className="hidden border-t border-divider py-6 text-center text-xs text-neutral-500 md:block">
      Anh ngữ Mrs Uyên · Học tiếng Anh mỗi ngày một chút
    </footer>
  );
}
