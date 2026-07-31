"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isTeacher } from "@/lib/types/user";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { ButtonLink } from "@/components/ui/button";

export default function TeacherPanelLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/teacher/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  // Đang khôi phục phiên: skeleton shell thay vì màn trắng.
  if (loading) {
    return (
      <div className="flex min-h-screen bg-bg">
        <div className="hidden h-screen w-60 shrink-0 border-r border-border bg-surface xl:block" />
        <div className="flex-1 p-7">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-alt" />
          <div className="mt-6 h-40 w-full animate-pulse rounded-2xl bg-surface-alt" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!isTeacher(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-text">
          Khu vực dành cho giáo viên
        </h1>
        <p className="max-w-sm text-text-secondary">
          Tài khoản của em là học sinh nên không vào được khu quản trị.
        </p>
        <ButtonLink href="/missions">Về khu học tập</ButtonLink>
      </div>
    );
  }

  return <TeacherShell>{children}</TeacherShell>;
}
