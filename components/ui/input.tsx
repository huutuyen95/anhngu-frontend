import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Ô nhập Option 1: radius 14px, viền 1.5px, cao 44px (admin) / 48px (học sinh qua class h-12).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 text-[15px] text-text transition-colors outline-none",
        "placeholder:text-text-muted",
        "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60",
        "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
