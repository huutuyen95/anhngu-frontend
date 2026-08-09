"use client";

import { Eye, Pencil, Send, BarChart3, Copy, FolderInput, Trash2, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { SKILL_LABEL, type Test } from "@/lib/types/test";
import { cn } from "@/lib/utils";

type Action = { key: string; label: string; desc: string; icon: LucideIcon; wrap: string; danger?: boolean };

const ACTIONS: Action[] = [
  { key: "preview", label: "Xem trước", desc: "Xem như học sinh + kiểm tra trước khi giao", icon: Eye, wrap: "bg-skill-listening-soft text-info" },
  { key: "edit", label: "Sửa đề", desc: "Mở trình soạn cấu trúc đề", icon: Pencil, wrap: "bg-brand-soft text-brand" },
  { key: "assign", label: "Giao bài", desc: "Giao đề vào buổi học của lớp", icon: Send, wrap: "bg-skill-writing-soft text-success-bold" },
  { key: "results", label: "Xem kết quả", desc: "Điểm & bài làm của học sinh", icon: BarChart3, wrap: "bg-accent-soft text-warning" },
  { key: "duplicate", label: "Nhân bản", desc: "Tạo bản sao để chỉnh sửa", icon: Copy, wrap: "bg-skill-speaking-soft text-skill-speaking" },
  { key: "move", label: "Chuyển thư mục", desc: "Đổi thư mục / lớp cho đề", icon: FolderInput, wrap: "bg-surface-alt text-text-secondary" },
  { key: "delete", label: "Xoá đề", desc: "Xoá đề khỏi hệ thống", icon: Trash2, wrap: "bg-danger-soft text-danger", danger: true },
];

/** A4menu — menu ⋯ của một đề. */
export function TestActionMenu({ test, open, onClose, onAction }: {
  test: Test | null;
  open: boolean;
  onClose: () => void;
  onAction: (key: string, test: Test) => void;
}) {
  if (!test) return null;
  const meta = [SKILL_LABEL[test.skill], `${test.question_count ?? 0} câu`, `${test.duration_minutes} phút`,
    test.attempts_count ? `${test.attempts_count} bài đã làm` : "chưa có bài làm"].join(" · ");

  return (
    <Modal open={open} onClose={onClose} title={test.title} description={meta}>
      <div className="flex flex-col gap-1">
        {ACTIONS.map((a) => (
          <button key={a.key} onClick={() => onAction(a.key, test)}
            className={cn("flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-alt", a.danger && "hover:bg-danger-soft")}>
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", a.wrap)}><a.icon className="size-4" /></span>
            <span className="min-w-0">
              <span className={cn("block text-sm font-semibold", a.danger ? "text-danger" : "text-text")}>{a.label}</span>
              <span className="block text-xs text-text-muted">{a.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
