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

/** Trộn 2 màu hex theo tỉ lệ t (0..1) của màu b. */
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v * (1 - t) + pb[i] * t).toString(16).padStart(2, "0")).join("");
}

/** Sinh ramp 100..900 từ màu gốc (500 = màu gốc; nhạt dần trộn trắng, đậm dần trộn đen). */
function accentRamp(color: string): Record<number, string> {
  const w = (t: number) => mixHex(color, "#ffffff", t);
  const k = (t: number) => mixHex(color, "#000000", t);
  // Các bậc nhạt (100–400) trộn nhiều trắng hơn cho nền/tint dịu; bậc đậm (600–900) giữ
  // đủ tương phản vì được dùng cho chữ.
  return { 100: w(0.91), 200: w(0.8), 300: w(0.62), 400: w(0.36), 500: color, 600: k(0.14), 700: k(0.3), 800: k(0.46), 900: k(0.62) };
}

/**
 * Áp màu hệ thống (brand.primary_color) cho CẢ hai khu.
 * - Khu giáo viên/admin (không bọc .organic): token --color-brand + bold/soft.
 * - Khu học sinh (.organic remap --color-brand→--color-accent): override cả dải
 *   --color-accent-100..900 nên brand/bold/soft của Organic tự đổi theo.
 * Chèn 1 <style> (đứng sau organic.css nên thắng cùng specificity của .organic).
 */
export function applyPrimaryColor(color: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
  const ramp = accentRamp(color);
  const accentVars = Object.entries(ramp).map(([k, v]) => `--color-accent-${k}:${v};`).join("");
  const css =
    `:root{--color-brand:${color};--color-brand-bold:${mixHex(color, "#000000", 0.14)};--color-brand-soft:${mixHex(color, "#ffffff", 0.92)};}` +
    `.organic{--color-accent:${color};${accentVars}}`;
  let el = document.getElementById("brand-vars-override") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "brand-vars-override";
    document.head.appendChild(el);
  }
  el.textContent = css;
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
        if (response.primary_color) applyPrimaryColor(response.primary_color);
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
