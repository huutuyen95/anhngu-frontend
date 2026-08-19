"use client";

import { Modal } from "@/components/ui/modal";
import type { ExitAction } from "@/features/tests/use-test-attempt";

/* ────────────────────────────────────────────────────────────────────────────
   Cảnh báo rời màn thi — DÙNG CHUNG cho cả 5 màn làm bài.

   Nội dung PHẢI khớp `exam.leave_action` của lượt làm:
     - 'autosubmit' → vượt hạn là bài tự nộp thật, doạ được.
     - 'warn'       → chỉ đếm và báo cho cô; KHÔNG được doạ "sẽ tự động nộp".
     - 'log'        → không hiện hộp này (hook đã chặn từ trước).

   Trước đây cả 4 màn hardcode câu "rời thêm một lần nữa, bài sẽ TỰ ĐỘNG NỘP ngay"
   trong khi cấu hình mặc định là 'warn' — em rời 5/3 lần vẫn làm tiếp bình thường,
   thành ra lời cảnh báo là doạ suông.
   ──────────────────────────────────────────────────────────────────────────── */

export function ExitWarnDialog({
  open,
  onClose,
  count,
  limit,
  action,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  limit: number;
  action: ExitAction;
}) {
  const overLimit = count > limit;
  const lastChance = count >= limit && !overLimit;

  const guidance =
    action === "autosubmit"
      ? lastChance || overLimit
        ? "Đây là lần cuối được phép — rời thêm một lần nữa, bài sẽ TỰ ĐỘNG NỘP ngay."
        : `Rời khỏi màn thi quá ${limit} lần thì bài sẽ tự động nộp. Em tập trung làm bài nhé!`
      : overLimit
        ? "Em đã vượt mức cho phép. Cô nhìn thấy số lần này khi chấm bài của em đấy."
        : `Cô có thể thấy em rời khỏi màn thi bao nhiêu lần. Quá ${limit} lần là bị ghi nhận — em tập trung làm bài nhé!`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Em vừa rời khỏi màn thi"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
        >
          Tiếp tục làm bài
        </button>
      }
    >
      <div className="text-[14.5px] leading-relaxed text-text-secondary">
        <p>
          Em đã rời khỏi màn làm bài{" "}
          {/* Vượt hạn thì đừng viết "5/3 lần" — nhìn như lỗi hiển thị. */}
          {overLimit ? (
            <>
              <b className="text-[#C1442F]">{count} lần</b>, quá mức cho phép ({limit} lần).
            </>
          ) : (
            <>
              <b className="text-[#C1442F]">
                {count}/{limit}
              </b>{" "}
              lần.
            </>
          )}
        </p>
        <p className="mt-2">{guidance}</p>
      </div>
    </Modal>
  );
}

/** Popup sau khi bài bị tự nộp vì rời màn thi quá số lần cho phép. */
export function AutoSubmittedDialog({
  open,
  onClose,
  limit,
}: {
  open: boolean;
  onClose: () => void;
  limit: number;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bài đã được nộp"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
        >
          Xem kết quả
        </button>
      }
    >
      <div className="text-[14.5px] leading-relaxed text-text-secondary">
        <p>
          Em đã rời khỏi màn thi quá <b className="text-[#C1442F]">{limit}</b> lần cho phép, nên
          hệ thống đã <b className="text-[#C1442F]">tự động nộp bài</b>.
        </p>
        <p className="mt-2">Em xem lại kết quả nhé.</p>
      </div>
    </Modal>
  );
}
