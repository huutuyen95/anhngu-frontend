"use client";

import { Check, Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";

type Props = {
  open: boolean;
  progress: number;
  title: string;
  description: string;
  completedDescription?: string;
};

export function OperationProgressModal({
  open,
  progress,
  title,
  description,
  completedDescription = "Đang chuyển đến danh sách kết quả…",
}: Props) {
  const completed = progress >= 100;

  return (
    <Modal open={open} onClose={() => {}} closable={false} title={completed ? "Hoàn tất" : title} description={completed ? completedDescription : description}>
      <div className="flex flex-col items-center gap-5 py-6" aria-live="polite" aria-busy={!completed}>
        <div className={completed
          ? "flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
          : "flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand"}
        >
          {completed ? <Check className="size-8" strokeWidth={3} /> : <Loader2 className="size-8 animate-spin" />}
        </div>
        <div className="w-full">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span className="text-text-secondary">{completed ? "Đã xử lý xong" : "Đang xử lý dữ liệu"}</span>
            <span className={completed ? "text-success" : "text-brand"}>{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-alt">
            <div
              className={completed ? "h-full rounded-full bg-success transition-[width] duration-300" : "h-full rounded-full bg-brand transition-[width] duration-300"}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-center text-xs text-text-muted">Vui lòng giữ cửa sổ này mở cho đến khi hoàn tất.</p>
      </div>
    </Modal>
  );
}
