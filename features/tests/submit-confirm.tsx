"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/* ────────────────────────────────────────────────────────────────────────────
   Hộp xác nhận nộp bài — DÙNG CHUNG cho cả 5 màn làm bài (trắc nghiệm, nghe,
   đọc, viết, nói). Còn câu chưa làm thì phải nói rõ CÒN BAO NHIÊU và LÀ NHỮNG
   CÂU NÀO, để em không nộp nhầm khi bỏ sót.

   Đừng viết lại chuỗi này ở từng màn: trước đây mỗi màn một câu chữ riêng nên
   nội dung lệch nhau và không màn nào chỉ ra được câu nào đang trống.
   ──────────────────────────────────────────────────────────────────────────── */

/** Số câu hiển thị tối đa trong danh sách, còn lại gộp thành "…và N câu nữa". */
const MAX_LISTED = 12;

export function SubmitConfirmDialog({
  open,
  onClose,
  onConfirm,
  missing,
  total,
  verb = "chưa làm",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Số thứ tự các câu chưa làm, theo đúng thứ tự hiện trên màn. */
  missing: number[];
  total: number;
  /** Cách gọi theo dạng đề: "chưa làm" · "chưa viết" · "chưa ghi âm". */
  verb?: string;
}) {
  const listed = missing.slice(0, MAX_LISTED);
  const rest = missing.length - listed.length;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Nộp bài?"
      confirmLabel="Nộp bài"
      description={
        missing.length > 0 ? (
          <div className="text-[14.5px] leading-relaxed text-text-secondary">
            <p>
              Em còn{" "}
              <b className="text-text">
                {missing.length}/{total} câu
              </b>{" "}
              {verb}:
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {listed.map((n) => (
                <span
                  key={n}
                  className="flex h-7 min-w-7 items-center justify-center rounded-lg px-2 font-display text-[13px] font-bold"
                  style={{ background: "#FFF3D3", color: "#B8860B" }}
                >
                  {n}
                </span>
              ))}
              {rest > 0 && (
                <span className="flex h-7 items-center px-1 text-[13px] font-semibold text-text-muted">
                  …và {rest} câu nữa
                </span>
              )}
            </div>

            <p className="mt-3">
              Câu bỏ trống tính <b className="text-text">0 điểm</b>. Em chắc chắn nộp bài chứ?
            </p>
          </div>
        ) : (
          "Em chắc chắn muốn nộp bài? Sau khi nộp sẽ không sửa được nữa."
        )
      }
    />
  );
}

/**
 * Số thứ tự các câu chưa làm, tính theo đúng thứ tự câu hiển thị trên màn
 * (câu 1 là câu đầu tiên của đề, không phải `question.order` của từng section).
 */
export function missingNumbers<T>(questions: T[], answered: (question: T) => boolean): number[] {
  return questions.flatMap((question, i) => (answered(question) ? [] : [i + 1]));
}
