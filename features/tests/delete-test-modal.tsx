"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deleteTest, updateTest } from "@/lib/api/tests";
import { Modal } from "@/components/ui/modal";
import type { Test } from "@/lib/types/test";
import { SKILL_SHORT } from "@/features/tests/skill";

/** A4del — xoá đề: cảnh báo mất N bài làm, gợi ý ẩn khỏi thư viện. */
export function DeleteTestModal({ test, open, onClose, onDone }: {
  test: Test | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!test) return null;

  const attempts = test.attempts_count ?? 0;

  async function hideInstead() {
    if (!test) return;
    setBusy(true);
    try {
      await updateTest(test.id, { is_published: false });
      toast.success("Đã ẩn đề khỏi thư viện.");
      onDone();
    } catch { toast.error("Không ẩn được đề."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!test) return;
    setBusy(true);
    try {
      await deleteTest(test.id, true);
      toast.success("Đã xoá đề thi.");
      onDone();
    } catch { toast.error("Không xoá được đề."); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Xoá "${test.title}"?`}
      description={`${SKILL_SHORT[test.skill]} · ${test.question_count ?? 0} câu`}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          <button onClick={hideInstead} disabled={busy}
            className="rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-semibold text-text hover:border-brand hover:text-brand disabled:opacity-60">
            Ẩn khỏi thư viện
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text">Huỷ</button>
            <button onClick={remove} disabled={busy}
              className="rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-danger)] disabled:opacity-60">
              Vẫn xoá
            </button>
          </div>
        </div>
      }>
      {attempts > 0 && (
        <div className="mb-3 flex gap-3 rounded-xl bg-danger-soft p-3.5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p><b>{attempts} bài làm</b> của học sinh sẽ bị xoá theo và <b>không khôi phục được</b>.</p>
        </div>
      )}
      <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-text-secondary">
        Muốn giữ dữ liệu bài làm? Hãy <b className="text-text">Ẩn khỏi thư viện</b> thay vì xoá — học sinh sẽ không thấy đề nhưng điểm cũ vẫn còn.
      </div>
    </Modal>
  );
}
