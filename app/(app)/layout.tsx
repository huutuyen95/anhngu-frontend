"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isTeacher } from "@/lib/types/user";
import { StudentShell } from "@/components/student/student-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (isTeacher(user.role)) {
      // Giáo viên vào khu học sinh → chuyển sang khu quản trị.
      router.replace("/teacher");
    }
  }, [loading, user, pathname, router]);

  // Đang khôi phục phiên hoặc chưa đủ điều kiện: skeleton thay vì màn trắng.
  if (loading || !user || isTeacher(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-border border-t-brand" />
      </div>
    );
  }

  return <StudentShell>{children}</StudentShell>;
}
