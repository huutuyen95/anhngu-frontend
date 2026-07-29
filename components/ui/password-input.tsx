"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Ô mật khẩu Option 1 với nút hiện/ẩn (icon mắt) bên phải.
 */
function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        data-slot="password-input"
        className={cn(
          "h-11 w-full min-w-0 rounded-[14px] border-[1.5px] border-border bg-surface pl-3.5 pr-11 text-[15px] text-text transition-colors outline-none",
          "placeholder:text-text-muted",
          "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60",
          "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
      >
        {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
      </button>
    </div>
  );
}

export { PasswordInput };
