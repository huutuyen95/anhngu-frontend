import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-border bg-surface p-10 text-center",
        className
      )}
    >
      {icon && (
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          {icon}
        </span>
      )}
      <p className="font-semibold text-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
