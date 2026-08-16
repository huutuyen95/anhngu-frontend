"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

export type PublicBranding = {
  center_name: string | null;
  primary_color: string | null;
  admin: {
    logo: string | null;
    favicon: string | null;
    tab_title: string | null;
  };
  student: {
    logo: string | null;
    favicon: string | null;
    tab_title: string | null;
    pwa_icon: string | null;
    banner: string | null;
    login_cover: string | null;
  };
  maintenance: boolean;
};

const BrandingContext = createContext<PublicBranding | null>(null);

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Nạp một lần cấu hình public, vừa áp metadata vừa cung cấp ảnh cho khu Student. */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith("/teacher");
  const [branding, setBranding] = useState<PublicBranding | null>(null);

  useEffect(() => {
    let active = true;
    api<PublicBranding>("/public/branding")
      .then((response) => {
        if (!active) return;
        setBranding(response);
        const area = isAdminArea ? response.admin : response.student;
        if (area.tab_title) document.title = area.tab_title;
        if (area.favicon) setFavicon(area.favicon);
      })
      .catch(() => {
        // Branding là bổ trợ; lỗi vẫn để ứng dụng dùng giao diện mặc định.
      });
    return () => { active = false; };
  }, [isAdminArea]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): PublicBranding | null {
  return useContext(BrandingContext);
}
