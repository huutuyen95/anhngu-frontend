"use client";

import { usePathname } from "next/navigation";
import { useBranding } from "@/components/branding-loader";

function isMenuLanding(pathname: string): boolean {
  if (["/missions", "/classes", "/library", "/reports"].includes(pathname)) return true;

  // Khi học sinh chỉ có một lớp, /classes tự chuyển thẳng vào trang lớp này.
  return /^\/classes\/[^/]+$/.test(pathname);
}

export function StudentMenuBanner() {
  const pathname = usePathname();
  const branding = useBranding();
  const bannerUrl = branding?.student.banner;

  if (!bannerUrl || !isMenuLanding(pathname)) return null;

  return (
    <section
      aria-label="Banner trung tâm Anh ngữ"
      className="mb-7 overflow-hidden rounded-[var(--radius-lg)] border-[1.5px] border-accent-300 bg-accent-100 p-1.5 shadow-[var(--shadow-sm)] sm:mb-9"
    >
      {/* Ảnh do super admin tải lên từ backend, URL thay đổi theo môi trường. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bannerUrl}
        alt={`Banner ${branding?.center_name ?? "trung tâm Anh ngữ"}`}
        className="block aspect-[3/1] w-full rounded-[calc(var(--radius-lg)-6px)] object-cover object-center sm:aspect-[4/1] lg:aspect-[5/1]"
      />
    </section>
  );
}
