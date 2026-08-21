"use client";

import { cn } from "@/lib/utils";
import { htmlToText } from "@/lib/sanitize";
import type { AttemptQuestion } from "@/lib/types/attempt";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/field";
import { AiSuggestion } from "@/features/grading/ai-suggestion";
import { CopyForChatGpt } from "@/features/grading/copy-for-chatgpt";

const textareaClass =
  "w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type GradeDraft = { score: number; feedback: string };

type Props = {
  index: number;
  question: AttemptQuestion;
  wordLimit: number | null;
  value: GradeDraft;
  onChange: (next: GradeDraft) => void;
  maxScore: number;
};

export function WritingGrader({ index, question, wordLimit, value, onChange, maxScore }: Props) {
  // Bài viết lưu dạng HTML (tiptap) — bóc thẻ trước khi hiện và trước khi đếm từ,
  // nếu không "<p>" cũng bị tính là một từ.
  const answerText = htmlToText(question.answer?.answer_text);
  const wordCount = countWords(answerText);
  const overLimit = !!wordLimit && wordCount > wordLimit;
  const alreadyGraded = question.answer?.graded_at != null;

  return (
    <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-text">Câu {index + 1} — Viết luận</span>
        {alreadyGraded && <StatusBadge tone="success">Đã chấm</StatusBadge>}
        {/* Cô chấm bằng ChatGPT của mình: bấm là có sẵn cả khối để dán. */}
        <CopyForChatGpt prompt={question.ai_prompt} />
      </div>

      {question.content && <p className="mt-2 text-sm text-text-secondary">{question.content}</p>}

      <div className="mt-3 rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary">Bài viết của học sinh</span>
          <StatusBadge tone={overLimit ? "danger" : "neutral"}>
            {wordCount} từ{wordLimit ? ` / ${wordLimit}` : ""}
          </StatusBadge>
        </div>
        <p className="whitespace-pre-wrap text-sm text-text">{answerText || "(chưa nộp bài viết)"}</p>
      </div>

      {/* Gợi ý của AI đặt NGAY TRÊN ô điểm để cô đọc rồi mới quyết. */}
      <AiSuggestion question={question} value={value} onChange={onChange} />

      <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
        <FormField htmlFor={`score-${question.id}`} label={`Điểm (tối đa ${maxScore})`}>
          <Input
            id={`score-${question.id}`}
            type="number"
            min={0}
            max={maxScore}
            step="0.5"
            value={value.score}
            onChange={(e) => onChange({ ...value, score: Number(e.target.value) })}
          />
        </FormField>
        <FormField htmlFor={`feedback-${question.id}`} label="Nhận xét">
          <textarea
            id={`feedback-${question.id}`}
            value={value.feedback}
            onChange={(e) => onChange({ ...value, feedback: e.target.value })}
            rows={2}
            className={cn(textareaClass)}
          />
        </FormField>
      </div>
    </div>
  );
}
