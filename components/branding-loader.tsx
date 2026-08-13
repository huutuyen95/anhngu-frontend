"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

type Branding = {
  center_name: string | null;
  primary_color: string | null;
  admin: { logo: string | null; favicon: string | null; tab_title: string | null };
  student: { favicon: string | null; tab_title: string | null };
};

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Nạp thương hiệu công khai (không cần auth) và áp favicon + tiêu đề tab theo khu
 * (quản trị vs học sinh). Gọi lúc khởi động; đổi cấu hình xong reload là thấy.
 */
export function BrandingLoader() {
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith("/teacher");

  useEffect(() => {
    let cancelled = false;
    api<Branding>("/public/branding")
      .then((b) => {
        if (cancelled) return;
        const area = isAdminArea ? b.admin : b.student;
        if (area.tab_title) document.title = area.tab_title;
        if (area.favicon) setFavicon(area.favicon);
      })
      .catch(() => {
        // Thương hiệu là bổ trợ — lỗi thì dùng mặc định, không chặn app.
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminArea]);

  return null;
}
