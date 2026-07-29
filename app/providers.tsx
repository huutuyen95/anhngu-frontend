"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function SessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onExpired() {
      toast.error("Phiên đăng nhập đã hết, vui lòng đăng nhập lại.");
      const target = pathname?.startsWith("/teacher") ? "/teacher/login" : "/login";
      router.replace(target);
    }
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [router, pathname]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SessionWatcher />
      {children}
      <Toaster position="top-right" richColors theme="light" />
    </AuthProvider>
  );
}
