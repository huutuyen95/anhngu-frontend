"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { BrandingProvider } from "@/components/branding-loader";

/**
 * Chỉ báo toast khi phiên hết hạn. KHÔNG tự điều hướng ở đây: `AuthProvider` đã set
 * `user = null` khi bắt sự kiện này, và guard trong `(app)/layout.tsx` /
 * `teacher/(panel)/layout.tsx` sẽ tự redirect kèm đúng `next` param. Nếu watcher này
 * cũng gọi `router.replace` (như cũ) thì có 2 lệnh điều hướng đua nhau — 1 cái không có
 * `next` — gây bounce qua lại giữa trang login và trang trước đó.
 */
function SessionWatcher() {
  useEffect(() => {
    function onExpired() {
      toast.error("Phiên đăng nhập đã hết, vui lòng đăng nhập lại.");
    }
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrandingProvider>
      <AuthProvider>
        <SessionWatcher />
        {children}
        <Toaster position="top-right" richColors theme="light" />
      </AuthProvider>
    </BrandingProvider>
  );
}
