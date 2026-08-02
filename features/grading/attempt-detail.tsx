"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { gradeAttempt } from "@/lib/api/attempts";
import type { AttemptDetail, AttemptQuestion } from "@/lib/types/attempt";
import { ATTEMPT_STATUS_LABEL, ATTEMPT_STATUS_TONE } from "@/lib/types/attempt";
import { SKILL_LABEL } from "@/lib/types/test";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { WritingGrader, type GradeDraft } from "@/features/grading/writing-grader";
import { SpeakingGrader } from "@/features/grading/speaking-grader";

export function AttemptDetailView({ initial }: { initial: AttemptDetail }) {
  const [attempt, setAttempt] = useState(initial);
  const [saving, setSaving] = useState(false);

  const gradableQuestions = useMemo(
    () =>
      attempt.test.parts.flatMap((p) =>
        p.sections.flatMap((s) => s.questions.filter((q) => q.type === "writing" || q.type === "speaking")),
      ),
    [attempt],
  );

  const [drafts, setDrafts] = useState<Record<number, GradeDraft>>(() =>
    Object.fromEntries(
      gradableQuestions.map((q) => [q.id, { score: q.answer?.score ?? 0, feedback: q.answer?.feedback ?? "" }]),
    ),
  );

  const canGrade = gradableQuestions.length > 0;

  async function handleGrade() {
    setSaving(true);
    try {
      const answers = gradableQuestions.map((q) => ({
        question_id: q.id,
        score: drafts[q.id]?.score ?? 0,
        feedback: drafts[q.id]?.feedback || null,
      }));
      const { attempt: updated } = await gradeAttempt(attempt.id, answers);
      setAttempt(updated);
      toast.success("Đã lưu điểm.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không lưu được điểm.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-text">{attempt.test.title}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {attempt.student.name} · {attempt.student.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone="info">{SKILL_LABEL[attempt.test.skill]}</StatusBadge>
            <StatusBadge tone={ATTEMPT_STATUS_TONE[attempt.status]}>{ATTEMPT_STATUS_LABEL[attempt.status]}</StatusBadge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
          <span>Điểm: {attempt.total_score ?? "—"}</span>
          {attempt.correct_count !== null && attempt.question_count !== null && (
            <span>
              Đúng: {attempt.correct_count}/{attempt.question_count}
            </span>
          )}
        </div>
      </div>

      {attempt.test.parts.map((part) => (
        <div key={part.id} className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
          <h2 className="font-display text-lg font-bold text-text">{part.title}</h2>
          {part.sections.map((section) => (
            <div key={section.id} className="mt-4 flex flex-col gap-3">
              {section.instruction && <p className="text-sm font-medium text-text-secondary">{section.instruction}</p>}
              {section.passage && (
                <p className="whitespace-pre-wrap rounded-xl bg-surface-alt p-3 text-sm text-text-secondary">
                  {section.passage}
                </p>
              )}
              {section.questions.map((q, qi) => {
                if (q.type === "writing") {
                  return (
                    <WritingGrader
                      key={q.id}
                      index={qi}
                      question={q}
                      wordLimit={attempt.test.word_limit}
                      maxScore={q.score}
                      value={drafts[q.id] ?? { score: 0, feedback: "" }}
                      onChange={(next) => setDrafts((d) => ({ ...d, [q.id]: next }))}
                    />
                  );
                }
                if (q.type === "speaking") {
                  return (
                    <SpeakingGrader
                      key={q.id}
                      index={qi}
                      question={q}
                      maxScore={q.score}
                      value={drafts[q.id] ?? { score: 0, feedback: "" }}
                      onChange={(next) => setDrafts((d) => ({ ...d, [q.id]: next }))}
                    />
                  );
                }
                return <McReview key={q.id} index={qi} question={q} />;
              })}
            </div>
          ))}
        </div>
      ))}

      {canGrade && (
        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" loading={saving} onClick={handleGrade}>
            Lưu chấm điểm
          </Button>
        </div>
      )}
    </div>
  );
}

function McReview({ index, question }: { index: number; question: AttemptQuestion }) {
  const selectedId = question.answer?.question_option_id ?? null;
  const answered = selectedId !== null;

  return (
    <div className="rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text">Câu {index + 1}</span>
        {answered ? (
          question.answer?.is_correct ? (
            <StatusBadge tone="success">Đúng</StatusBadge>
          ) : (
            <StatusBadge tone="danger">Sai</StatusBadge>
          )
        ) : (
          <StatusBadge tone="neutral">Bỏ trống</StatusBadge>
        )}
      </div>
      {question.content && <p className="mt-1.5 text-sm text-text">{question.content}</p>}

      <div className="mt-2.5 flex flex-col gap-1.5">
        {question.options.map((opt) => {
          const isSelected = opt.id === selectedId;
          return (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border-[1.5px] px-3 py-2 text-sm",
                opt.is_correct
                  ? "border-success bg-success-soft text-text"
                  : isSelected
                    ? "border-danger bg-danger-soft text-text"
                    : "border-border bg-surface text-text-secondary",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                {opt.label}
              </span>
              <span className="flex-1">{opt.content}</span>
              {opt.is_correct && <Check className="size-4 shrink-0 text-success" />}
              {isSelected && !opt.is_correct && <X className="size-4 shrink-0 text-danger" />}
            </div>
          );
        })}
      </div>

      {question.explanation && (
        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-text-secondary">
          <span className="font-semibold text-text">Lời giải: </span>
          {question.explanation}
        </p>
      )}
    </div>
  );
}
