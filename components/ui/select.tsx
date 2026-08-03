"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Cho select giãn hết chiều rộng cha (mặc định là pill co theo nội dung). */
  block?: boolean;
  wrapClassName?: string;
};

/**
 * Dropdown pill dùng chung — bo tròn, viền 1.5px, mũi ▾ ở phải.
 * Đổi CSS ở đây là mọi dropdown trong app đổi theo.
 */
export const Select = React.forwardRef<HTMLSelectElement, Props>(function Select(
  { className, wrapClassName, block, children, ...props },
  ref,
) {
  return (
    <div className={cn("relative", block ? "flex w-full" : "inline-flex", wrapClassName)}>
      <select
        ref={ref}
        {...props}
        className={cn(
          "h-11 w-full cursor-pointer appearance-none rounded-full border-[1.5px] border-border bg-surface pl-4 pr-9 text-sm font-medium text-text outline-none transition-colors hover:border-border-strong focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
    </div>
  );
});
