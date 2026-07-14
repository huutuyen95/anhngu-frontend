"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  icon?: ReactNode;
  backHref?: string;
};

// Khuôn dùng chung cho mọi trang nội dung: đặt ở đầu mỗi trang, phía trên nội dung —
// <PageHeader title="..." icon={<...>} backHref="/duong-dan-quay-lai" />
export function PageHeader({ title, icon, backHref }: PageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <div className="sticky top-16 z-30 -mx-6 mb-6 flex h-14 items-center gap-3 border-b border-border bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          {icon}
        </div>
      )}

      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    </div>
  );
}
