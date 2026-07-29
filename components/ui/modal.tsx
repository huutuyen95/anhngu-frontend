"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
};

/** Modal Option 1: overlay + card radius 24, đóng bằng Esc / nút X / click nền. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,51,48,0.45)] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border-[1.5px] border-border bg-surface shadow-[0_20px_60px_rgba(58,51,48,0.18)]",
          size === "lg" ? "max-w-3xl" : "max-w-md"
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-text">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
