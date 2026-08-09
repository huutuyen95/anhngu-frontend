"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Loader2, Smartphone } from "lucide-react";
import { getPreflight } from "@/lib/api/tests";
import { SKILL_LABEL, type Test, type TestPreflight } from "@/lib/types/test";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A4prev — xem trước + checklist trước khi giao. */
export function PreflightModal({ test, open, onClose, onEdit, onAssign }: {
  test: Test | null;
  open: boolean;
  onClose: () => void;
  onEdit: (test: Test) => void;
  onAssign: (test: Test) => void;
}) {
  const [data, setData] = useState<TestPreflight | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !test) return;
    setData(null);
    setLoading(true);
    getPreflight(test.id).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [open, test]);

  if (!test) return null;

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Xem trước như học sinh"
      description="Kiểm tra trước khi giao · không ghi nhận lượt làm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onEdit(test)}>Sửa đề</Button>
          <Button onClick={() => onAssign(test)}>Giao bài ngay</Button>
        </div>
      }>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Khung mobile rút gọn */}
        <div className="rounded-2xl bg-bg p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase text-text-muted"><Smartphone className="size-3.5" /> Mobile</p>
          <div className="rounded-2xl bg-surface p-4 shadow-[0_4px_16px_rgba(58,51,48,0.06)]">
            <p className="font-display text-base font-bold text-text">{test.title}</p>
            <p className="mt-0.5 text-xs text-text-muted">{SKILL_LABEL[test.skill]} · {test.duration_minutes} phút · {test.question_count ?? 0} câu</p>
            <div className="mt-3 rounded-xl border border-border p-3 text-sm text-text-secondary">
              <p className="font-semibold text-text">Câu 1.</p>
              <p className="mt-1">Xem trước nội dung câu hỏi ở đây…</p>
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="rounded-lg border border-border px-2.5 py-1.5">A. Lựa chọn A</span>
                <span className="rounded-lg border border-border px-2.5 py-1.5">B. Lựa chọn B</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase text-text-muted">Kiểm tra trước khi giao</p>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-text-muted"><Loader2 className="size-4 animate-spin" /> Đang kiểm tra…</div>
          ) : !data ? (
            <p className="py-6 text-sm text-text-muted">Không tải được kiểm tra.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    c.ok ? "bg-success-soft text-success-bold" : "bg-accent-soft text-warning")}>
                    {c.ok ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text">{c.label}</span>
                    <span className="block text-xs text-text-muted">{c.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-text-muted">Trộn thứ tự câu: theo cấu hình đề · Thang điểm 10 chia đều.</p>
        </div>
      </div>
    </Modal>
  );
}
