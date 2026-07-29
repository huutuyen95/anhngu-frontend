"use client";

import Link from "next/link";
import { Users, School, FileText, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth";

const CARDS = [
  { label: "Học sinh", href: "/teacher/students", icon: Users, hint: "Quản lý tài khoản học sinh" },
  { label: "Lớp học", href: "/teacher/classrooms", icon: School, hint: "Sắp có" },
  { label: "Đề thi", href: "/teacher/tests", icon: FileText, hint: "Sắp có" },
  { label: "Kết quả làm bài", href: "/teacher/results", icon: ClipboardList, hint: "Sắp có" },
];

export default function TeacherDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-text">
        Xin chào, {user?.name} 👋
      </h1>
      <p className="mt-1 text-text-secondary">
        Bảng điều khiển quản trị — chọn một mục để bắt đầu.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          const ready = c.href === "/teacher/students";
          const inner = (
            <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(58,51,48,0.08)]">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-text">{c.label}</p>
                <p className="text-xs text-text-muted">{c.hint}</p>
              </div>
            </div>
          );
          return ready ? (
            <Link key={c.href} href={c.href}>
              {inner}
            </Link>
          ) : (
            <div key={c.href} className="cursor-not-allowed opacity-70">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
