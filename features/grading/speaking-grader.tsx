"use client";

import { cn } from "@/lib/utils";
import type { AttemptQuestion } from "@/lib/types/attempt";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/field";
import type { GradeDraft } from "@/features/grading/writing-grader";
import { AiSuggestion } from "@/features/grading/ai-suggestion";

const textareaClass =
  "w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";

type Props = {
  index: number;
  question: AttemptQuestion;
  value: GradeDraft;
  onChange: (next: GradeDraft) => void;
  maxScore: number;
};

export function SpeakingGrader({ index, question, value, onChange, maxScore }: Props) {
  const audioUrl = question.answer?.answer_file_url ?? null;
  const alreadyGraded = question.answer?.graded_at != null;

  return (
    <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text">Câu {index + 1} — Nói</span>
        {alreadyGraded && <StatusBadge tone="success">Đã chấm</StatusBadge>}
      </div>

      {question.content && <p className="mt-2 text-sm text-text-secondary">{question.content}</p>}

      {/* Gợi ý cô đã đưa cho em — cần thấy lại để chấm đúng theo yêu cầu của đề. */}
      {question.hint && (
        <div className="mt-2 rounded-xl bg-surface-alt px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-text-muted">
            Gợi ý đã đưa cho em
          </span>
          <p className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-text-secondary">
            {question.hint}
          </p>
        </div>
      )}

      {!!question.images?.length && (
        <div className="mt-2 flex flex-wrap gap-2">
          {question.images.map((url, i) => (
            <img
              key={`${url}-${i}`}
              src={url}
              alt=""
              className="size-20 shrink-0 rounded-xl border-[1.5px] border-border object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-3 rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
        <span className="mb-1.5 block text-xs font-semibold text-text-secondary">Bài nói của học sinh</span>
        {audioUrl ? (
          <audio controls src={audioUrl} className="h-10 w-full" />
        ) : (
          <p className="text-sm text-text-muted">(chưa nộp bài nói)</p>
        )}
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
