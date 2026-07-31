import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: ReactNode;
  iconTone?: "brand" | "success" | "warning" | "info";
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: "muted" | "success" | "warning" | "danger";
  href?: string;
  className?: string;
};

const ICON_TONES = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

const HINT_TONES = {
  muted: "text-text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function StatCard({
  icon,
  iconTone = "brand",
  label,
  value,
  hint,
  hintTone = "muted",
  href,
  className,
}: StatCardProps) {
  const body = (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-5 transition-all",
        href && "hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(58,51,48,0.08)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            ICON_TONES[iconTone]
          )}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <p className="mt-0.5 font-display text-2xl font-extrabold text-text">
          {value}
        </p>
        {hint && (
          <p className={cn("mt-0.5 text-xs font-medium", HINT_TONES[hintTone])}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
