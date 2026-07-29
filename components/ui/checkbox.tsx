"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Checkbox Option 1: chưa chọn = ô trắng viền; đã chọn = nền brand + ✓ trắng;
 * indeterminate (header chọn một phần) = nền brand + gạch ngang.
 * Toggle đặt ở <label> nên bấm vào CHỮ hay Ô đều đổi trạng thái.
 */
export function Checkbox({
  checked = false,
  indeterminate = false,
  onCheckedChange,
  disabled,
  label,
  id,
  className,
  ...aria
}: CheckboxProps) {
  const active = checked || indeterminate;

  function toggle() {
    if (!disabled) onCheckedChange?.(!checked);
  }

  return (
    <label
      onClick={toggle}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 select-none",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <span
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        aria-label={aria["aria-label"]}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        id={id}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          active
            ? "border-brand bg-brand text-white"
            : "border-border-strong bg-surface"
        )}
      >
        {indeterminate ? (
          <Minus className="size-3.5" strokeWidth={3} />
        ) : checked ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : null}
      </span>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  );
}
