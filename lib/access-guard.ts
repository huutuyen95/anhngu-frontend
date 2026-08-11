"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types/user";

/**
 * Guard quyền truy cập dùng chung cho MỌI trang khu quản trị.
 *
 * Khi người dùng đã đăng nhập nhưng KHÔNG thoả điều kiện `predicate` → tự điều hướng
 * về `fallback` (mặc định dashboard `/teacher`) thay vì hiện màn "không có quyền".
 * Trả `allowed` để trang chỉ render nội dung khi đủ quyền, và `ready` để biết đã
 * xác thực xong hay chưa (tránh nháy màn khi đang khôi phục phiên).
 *
 * Ví dụ: const { allowed } = useAccessGuard((u) => u.is_super_admin);
 */
export function useAccessGuard(
  predicate: (user: User) => boolean,
  fallback = "/teacher",
): { allowed: boolean; ready: boolean } {
  const { user, loading } = useAuth();
  const router = useRouter();

  const ready = !loading;
  const allowed = !!user && predicate(user);
  const denied = ready && !!user && !allowed; // đăng nhập rồi nhưng thiếu quyền

  useEffect(() => {
    if (denied) router.replace(fallback);
  }, [denied, fallback, router]);

  return { allowed, ready };
}

/** Tiện ích: chỉ super admin mới vào, còn lại đưa về dashboard. */
export function useRequireSuperAdmin(fallback = "/teacher") {
  return useAccessGuard((u) => u.is_super_admin, fallback);
}
