"use client";

import { useEffect } from "react";
import { X, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadWordTemplate } from "@/lib/api/tests";

const BLOCKS: { chip: string; title: string; code: string; note: string }[] = [
  {
    chip: "Cấu trúc", title: "PART / SECTION",
    code: "PART 1: Đọc hiểu\nSECTION 1",
    note: "Mỗi PART là một phần lớn; SECTION là nhóm nhỏ (dùng cho đề nghe/đọc nhiều đoạn).",
  },
  {
    chip: "Câu hỏi", title: "Trắc nghiệm A/B/C/D",
    code: "Câu 1. What is the capital of Vietnam?\nA. Hanoi\nB. Hue\n==DA: A\n==LG: Hà Nội là thủ đô.",
    note: "==DA là đáp án đúng (nhiều đáp án ngăn bằng /). ==LG là lời giải (không bắt buộc).",
  },
  {
    chip: "Câu hỏi", title: "Điền từ",
    code: "Câu 2. She ___ to school yesterday.\n==fill\n==DA: went/walked",
    note: "Thêm ==fill để đánh dấu câu điền từ; nhiều đáp án chấp nhận ngăn bằng /.",
  },
  {
    chip: "Đọc hiểu", title: "Đoạn văn (Passage)",
    code: "==PASSAGE: Tiêu đề đoạn\nNội dung đoạn văn ở đây…\n==ENDPASSAGE",
    note: "Đoạn văn gắn cho cả SECTION, hiện phía trên các câu hỏi của section đó.",
  },
  {
    chip: "Tự luận", title: "Viết luận",
    code: "Câu 4. Write about your last holiday.\n==essay\n==LIMIT: 150",
    note: "==essay đánh dấu câu viết; ==LIMIT là giới hạn số từ.",
  },
];

/** A4guide — drawer cú pháp file Word. */
export function WordGuideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[rgba(58,51,48,0.45)]" onMouseDown={onClose}>
      <div className="flex h-full w-full max-w-[520px] flex-col bg-surface shadow-[0_0_60px_rgba(58,51,48,0.25)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold text-text">Cú pháp file Word</h2>
          <button onClick={onClose} aria-label="Đóng" className="flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-text"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            {BLOCKS.map((b, i) => (
              <div key={i} className="rounded-2xl border-[1.5px] border-border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">{b.chip}</span>
                  <span className="font-display text-base font-bold text-text">{b.title}</span>
                </div>
                <pre className="whitespace-pre-line rounded-xl bg-bg px-3.5 py-3 text-sm text-text">{b.code}</pre>
                <p className="mt-2 text-xs text-text-secondary">{b.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <button onClick={() => downloadWordTemplate().catch(() => toast.error("Không tải được file mẫu."))}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-semibold text-text hover:border-brand hover:text-brand">
            <Download className="size-4" /> Tải file mẫu
          </button>
          <button onClick={onClose} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)]">Đã hiểu</button>
        </div>
      </div>
    </div>
  );
}
