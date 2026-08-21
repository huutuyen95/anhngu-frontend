"use client";

import { useState } from "react";
import { ListChecks, Headphones, Mic, BookOpen, PenLine, FileUp } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createTest } from "@/lib/api/tests";
import { Modal } from "@/components/ui/modal";
import { SKILL_CHIP } from "@/features/tests/skill";
import type { Skill, TestFormat } from "@/lib/types/test";
import { cn } from "@/lib/utils";

/** Dạng đề = 5 kỹ năng của `Skill` (backend nhận đúng 5 giá trị này) + lối import Word. */
type Kind = Skill | "import";

const CARDS: { kind: Kind; label: string; icon: typeof ListChecks; wrap: string; desc: string; meta: string }[] = [
  { kind: "listening", label: "Nghe", icon: Headphones, wrap: SKILL_CHIP.listening, desc: "Gắn audio theo section, giới hạn số lần nghe.", meta: "Chấm tự động · đếm lần nghe ở máy chủ" },
  { kind: "speaking", label: "Nói", icon: Mic, wrap: SKILL_CHIP.speaking, desc: "Học viên ghi âm câu trả lời theo yêu cầu của đề.", meta: "Cô chấm tay theo tiêu chí" },
  { kind: "reading", label: "Đọc", icon: BookOpen, wrap: SKILL_CHIP.reading, desc: "Đoạn văn kèm câu hỏi hiểu và suy luận.", meta: "Chấm tự động · thang 10 chia đều" },
  { kind: "writing", label: "Viết", icon: PenLine, wrap: SKILL_CHIP.writing, desc: "Đề viết luận có giới hạn từ và tiêu chí.", meta: "Cô chấm tay theo tiêu chí" },
  { kind: "mixed", label: "Trắc nghiệm", icon: ListChecks, wrap: SKILL_CHIP.mixed, desc: "Câu A/B/C/D, điền từ, True/False/Not Given.", meta: "Chấm tự động · thang 10 chia đều" },
  { kind: "import", label: "Import từ Word", icon: FileUp, wrap: "bg-accent-soft text-warning", desc: "Tải lên file .docx theo mẫu, hệ thống tự tách câu.", meta: "Nhanh nhất khi đã có đề sẵn" },
];

/** A4new — chọn dạng đề trước khi tạo. */
export function CreateTestModal({ open, onClose, categoryId, format, onImport }: { open: boolean; onClose: () => void; categoryId?: number | null; format?: TestFormat; onImport?: () => void }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Kind>("mixed");
  const [busy, setBusy] = useState(false);

  async function proceed() {
    if (picked === "import") {
      onImport?.();
      return;
    }
    setBusy(true);
    try {
      // `picked` đã là giá trị Skill hợp lệ ("mixed" chính là nhãn "Trắc nghiệm" trong
      // SKILL_LABEL) nên gửi thẳng — không map tay để khỏi lệch nhãn như trước.
      const { test } = await createTest({ title: "Đề thi mới", skill: picked, format: format ?? "standard", category_id: categoryId ?? null });
      router.push(`/teacher/tests/${test.id}/edit`);
    } catch {
      toast.error("Không tạo được đề thi.");
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Tạo đề thi mới"
      description="Chọn dạng — quyết định cách soạn và cách chấm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text">Huỷ</button>
          <button onClick={proceed} disabled={busy}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)] disabled:opacity-60">
            {picked === "import" ? "Tiếp tục" : "Tạo & mở trình soạn"}
          </button>
        </div>
      }>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <button key={c.kind} onClick={() => setPicked(c.kind)} aria-pressed={picked === c.kind}
            className={cn("flex flex-col rounded-2xl border-[1.5px] p-4 text-left transition-all hover:-translate-y-0.5",
              picked === c.kind ? "border-brand bg-brand-soft/40" : "border-border bg-surface hover:border-brand")}>
            <span className={cn("mb-3 flex size-11 items-center justify-center rounded-2xl", c.wrap)}><c.icon className="size-5" /></span>
            <span className="font-display text-base font-bold text-text">{c.label}</span>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{c.desc}</p>
            <p className="mt-2 text-xs font-semibold text-text-muted">{c.meta}</p>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-text-secondary">
        Đã có đề trên Word? <b className="text-text">Import từ Word</b> là cách nhanh nhất — hệ thống tự tách Part/Section/câu hỏi theo mẫu.
      </div>
    </Modal>
  );
}
