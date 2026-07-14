"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  LayoutGrid,
  Library,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: "/missions", label: "Nhiệm vụ", icon: CalendarCheck },
  { href: "/classroom", label: "Lớp học", icon: LayoutGrid },
  { href: "/library", label: "Thư viện", icon: Library },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden max-h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-border bg-white p-4 md:flex md:flex-col">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150",
                active
                  ? "bg-[#0a2a5e] text-white"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
