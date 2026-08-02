"use client";

import { FileText, GraduationCap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type Choice = {
  type: "document" | "lecture";
  label: string;
  icon: typeof FileText;
  iconWrap: string;
  desc: string;
  bullets: string[];
  recommended?: boolean;
};

const CHOICES: Choice[] = [
  {
    type: "document",
    label: "Tài liệu",
    icon: FileText,
    iconWrap: "bg-surface text-text-secondary",
    desc: "Học sinh tự tìm đọc trong Thư viện nếu cô bật “Hiện trong thư viện”. Cũng giao vào buổi học được.",
    bullets: ["Có công tắc Hiện trong thư viện", "Hợp với: đề cương, mẹo làm bài, bảng động từ"],
    recommended: true,
  },
  {
    type: "lecture",
    label: "Bài giảng",
    icon: GraduationCap,
    iconWrap: "bg-accent-soft text-text",
    desc: "Chỉ đến học sinh khi cô giao vào buổi học. Không xuất hiện ở Thư viện.",
    bullets: ["Không có công tắc thư viện", "Hợp với: bài giảng theo buổi, video chữa đề"],
  },
];

/** Popup chọn loại nội dung khi bấm "Tạo nội dung" — quyết định học sinh thấy nội dung ở đâu. */
export function CreateContentModal({ open, onClose, onPick }: {
  open: boolean;
  onClose: () => void;
  onPick: (type: "document" | "lecture") => void;
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Tạo nội dung mới"
      description="Chọn loại — quyết định học sinh nhìn thấy nội dung ở đâu">
      <div className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map((c) => (
          <button key={c.type} onClick={() => onPick(c.type)}
            className={cn(
              "flex flex-col rounded-2xl border-[1.5px] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_10px_24px_rgba(58,51,48,0.1)]",
              c.recommended ? "border-brand bg-brand-soft/50" : "border-border bg-surface"
            )}>
            <span className={cn("mb-4 flex size-12 items-center justify-center rounded-2xl", c.iconWrap)}>
              <c.icon className="size-6" />
            </span>
            <span className="font-display text-lg font-bold text-text">{c.label}</span>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{c.desc}</p>
            <ul className="mt-3 flex flex-col gap-1">
              {c.bullets.map((b) => (
                <li key={b} className={cn("text-sm font-semibold", c.recommended ? "text-brand" : "text-text-secondary")}>· {b}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-text-secondary">
        Chọn nhầm vẫn đổi được sau trong màn soạn. Nội dung đã giao cho học sinh thì vẫn xem được kể cả khi tắt “Hiện trong thư viện”.
      </div>
    </Modal>
  );
}
