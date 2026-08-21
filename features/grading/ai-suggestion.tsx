"use client";

import { Sparkles, AlertTriangle } from "lucide-react";
import type { AttemptQuestion } from "@/lib/types/attempt";
import type { GradeDraft } from "@/features/grading/writing-grader";

/**
 * Gợi ý chấm của AI, đặt ngay trên ô điểm/nhận xét của cô.
 *
 * Đây CHỈ là đề xuất: điểm chính thức vẫn là điểm cô bấm Lưu, và học viên không thấy gì
 * cho tới lúc đó. Vì vậy khối này luôn nói rõ "AI đề xuất" và để cô chủ động bấm dùng,
 * không tự điền đè lên ô cô đang gõ.
 */
export function AiSuggestion({
  question,
  value,
  onChange,
}: {
  question: AttemptQuestion;
  value: GradeDraft;
  onChange: (next: GradeDraft) => void;
}) {
  const ai = question.ai_suggestion;

  if (!ai) return null;

  if (ai.status === "failed") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border-[1.5px] border-border bg-surface-alt px-3.5 py-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="text-[13px] leading-relaxed text-text-secondary">
          <b className="text-text">AI chưa chấm được câu này.</b> Cô chấm tay giúp em nhé.
          {ai.error && <span className="block text-xs text-text-muted">({ai.error})</span>}
        </div>
      </div>
    );
  }

  const canUseScore = ai.score !== null && ai.score !== undefined;

  return (
    <div className="mt-3 rounded-xl border-[1.5px] border-accent-200 bg-accent-soft px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-accent-800">
          <Sparkles className="size-[13px]" strokeWidth={2.6} />
          AI đề xuất
        </span>
        {ai.model && <span className="text-[11px] text-text-muted">{ai.model}</span>}
        <span className="text-[11px] font-semibold text-text-muted">
          · Cô duyệt lại rồi mới lưu
        </span>
      </div>

      {ai.feedback && (
        <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-text">
          {ai.feedback}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {canUseScore && (
          <button
            type="button"
            onClick={() => onChange({ ...value, score: Number(ai.score) })}
            className="h-8 rounded-full border-[1.5px] border-accent-300 bg-surface px-3 text-xs font-bold text-accent-800 transition-colors hover:border-brand hover:text-brand-bold"
          >
            Dùng điểm {ai.score}
          </button>
        )}
        {ai.feedback && (
          <button
            type="button"
            onClick={() => onChange({ ...value, feedback: ai.feedback ?? "" })}
            className="h-8 rounded-full border-[1.5px] border-accent-300 bg-surface px-3 text-xs font-bold text-accent-800 transition-colors hover:border-brand hover:text-brand-bold"
          >
            Chép vào nhận xét
          </button>
        )}
      </div>
    </div>
  );
}
