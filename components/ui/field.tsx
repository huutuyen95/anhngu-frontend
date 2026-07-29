import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  /** id của control bên trong — dùng cho <label htmlFor>. */
  htmlFor: string;
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Bọc 1 control có label thật + chỗ báo lỗi (aria-describedby). Không dùng placeholder thay label.
 */
export function FormField({
  htmlFor,
  label,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-text"
      >
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>

      {children}

      {hint && !error && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
