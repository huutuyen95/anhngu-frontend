"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SubmitConfirmDialog, missingNumbers } from "@/features/tests/submit-confirm";
import { Modal } from "@/components/ui/modal";
import {
  hasAnswer,
  formatRemaining,
  type Answer,
  type Part,
  type Question,
  type TestDetail,
  type TestAttemptState,
} from "@/features/tests/use-test-attempt";

/* ────────────────────────────────────────────────────────────────────────────
   Màn làm bài ĐỀ READING (S7d) — "trang sách" 2 cột, toàn màn hình:
     - trang trái  = nội dung bài đọc theo Part, cuối mỗi part là ô số câu hỏi
     - trang phải  = card câu hỏi trắc nghiệm (1 đáp án)
   Cả hai trang cuộn ĐỘC LẬP; thanh trên (đồng hồ, bộ đếm, Nộp bài) cố định.
   Chỉ dùng cho đề `skill === "reading"` — logic vòng đời lượt làm (autosave,
   đếm giờ, chống thoát tab, nộp bài) lấy từ `useTestAttempt`, dùng chung với
   màn làm bài mặc định.
   ──────────────────────────────────────────────────────────────────────────── */

function chipColors(answered: boolean, marked: boolean) {
  if (answered && marked) return { background: "#FDEBDD", border: "#FFC94D", color: "#D65F27" };
  if (answered) return { background: "#FDEBDD", border: "#FDEBDD", color: "#D65F27" };
  if (marked) return { background: "#FFF3D3", border: "#FFC94D", color: "#B8860B" };
  return { background: "#FFFFFF", border: "#EFE7D4", color: "#8A8073" };
}

function splitParagraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M5 21V4m0 0h11l-1.6 3.6L16 11H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReadingTestAttempt({
  attempt,
  test,
}: {
  attempt: TestAttemptState;
  test: TestDetail;
}) {
  const rightScrollerRef = useRef<HTMLDivElement | null>(null);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Full màn hình: khoá cuộn body trong lúc màn này đang mở.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const sortedParts = useMemo(() => test.parts.slice().sort((a, b) => a.order - b.order), [test]);
  const partQuestions = useMemo(
    () =>
      new Map(
        sortedParts.map((part) => [
          part.id,
          part.sections
            .slice()
            .sort((a, b) => a.order - b.order)
            .flatMap((section) => section.questions.slice().sort((a, b) => a.order - b.order)),
        ]),
      ),
    [sortedParts],
  );
  const allQuestions = useMemo(
    () => sortedParts.flatMap((part) => partQuestions.get(part.id) ?? []),
    [sortedParts, partQuestions],
  );
  const questionIndex = useMemo(
    () => new Map(allQuestions.map((q, i) => [q.id, i + 1])),
    [allQuestions],
  );

  const answeredCount = allQuestions.filter((q) => hasAnswer(attempt.answers[q.id])).length;
  // Danh sách câu còn trống — hiện rõ trong hộp xác nhận nộp bài để em không bỏ sót.
  const missingList = missingNumbers(allQuestions, (q) => hasAnswer(attempt.answers[q.id]));

  const remainingMs = attempt.deadline ? Math.max(0, attempt.deadline - attempt.now) : null;
  const totalMs = test.duration_minutes > 0 ? test.duration_minutes * 60_000 : null;
  const remainingRatio =
    remainingMs !== null && totalMs ? Math.min(1, Math.max(0, remainingMs / totalMs)) : null;
  const urgent = remainingMs !== null && remainingMs < 5 * 60_000;

  /** Bấm ô số ở trang trái → cuộn vùng cuộn trang phải tới card câu đó. */
  function goToQuestion(questionId: number) {
    const el = questionRefs.current[questionId];
    const scroller = rightScrollerRef.current;
    if (!el || !scroller) return;
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - 18), behavior: "smooth" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden rounded-[26px]"
      style={{ background: "#FBF7EA", fontFamily: "var(--font-sans)" }}
    >
      {/* ── Thanh trên ── */}
      <div
        className="flex h-[74px] shrink-0 items-center gap-4 px-[26px]"
        style={{ background: "#FFFFFF", borderBottom: "1.5px solid #EFE7D4" }}
      >
        <Link
          href={attempt.routes.list}
          className="shrink-0 text-[13px] font-bold text-[#8A8073] transition-colors hover:text-[#D65F27]"
        >
          ← Thoát
        </Link>
        <span className="h-[26px] w-[1.5px] shrink-0" style={{ background: "#EFE7D4" }} />
        <h1
          className="min-w-0 truncate font-display text-[20px] font-bold leading-tight"
          style={{ color: "#3A3330" }}
        >
          {test.title}
        </h1>
        <span
          className="shrink-0 rounded-full px-3 py-[5px] text-[11.5px] font-bold"
          style={{ background: "#FDEBDD", color: "#D65F27" }}
        >
          {`ĐỀ ĐỌC · ${sortedParts.length} PART · ${allQuestions.length} CÂU`}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <div className="text-right">
            <p
              className="text-[10.5px] font-bold uppercase tracking-[0.5px]"
              style={{ color: "#B5AC9C" }}
            >
              Đã trả lời
            </p>
            <p className="font-display text-[16px] font-bold" style={{ color: "#3A3330" }}>
              {answeredCount}/{allQuestions.length}
            </p>
          </div>

          <div
            className="flex h-[46px] items-center gap-3 rounded-full px-4"
            style={{ background: "#FDFBF3", border: "1.5px solid #EFE7D4" }}
          >
            <span className="text-base">⏱</span>
            {remainingMs !== null ? (
              <>
                <span
                  className="font-display text-[19px] font-bold tabular-nums"
                  style={{ color: urgent ? "#C1442F" : "#3A3330" }}
                >
                  {formatRemaining(remainingMs)}
                </span>
                {remainingRatio !== null && (
                  <div
                    className="h-[6px] w-[76px] overflow-hidden rounded-full"
                    style={{ background: "#F0EADA" }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                      style={{ width: `${remainingRatio * 100}%`, background: "#F2793B" }}
                    />
                  </div>
                )}
              </>
            ) : (
              <span className="font-display text-[15px] font-bold" style={{ color: "#3A3330" }}>
                Không giới hạn
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => attempt.setConfirmSubmit(true)}
            disabled={attempt.submitting}
            className="flex h-[46px] items-center rounded-full px-[26px] text-[14.5px] font-bold text-white transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-60"
            style={{ background: "#F2793B", boxShadow: "0 3px 0 #D65F27" }}
          >
            {attempt.submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      </div>

      {attempt.error && (
        <p
          className="shrink-0 px-[26px] py-1.5 text-[12.5px] font-semibold"
          style={{ background: "#FDE7E2", color: "#C1442F" }}
        >
          {attempt.error}
        </p>
      )}

      {/* ── Vùng sách ── */}
      <div className="flex min-h-0 flex-1">
        {/* Trang trái — nội dung bài đọc */}
        <div className="flex min-h-0 min-w-0 flex-[1.04] flex-col" style={{ background: "#FDFBF3" }}>
          <div
            className="flex shrink-0 items-center gap-3 px-8 py-3.5"
            style={{ borderBottom: "1.5px solid #EFE7D4" }}
          >
            <span
              className="text-[10.5px] font-bold uppercase tracking-[0.5px]"
              style={{ color: "#B5AC9C" }}
            >
              Nội dung bài đọc
            </span>
            <span
              className="rounded-full px-3 py-1 text-[11.5px] font-semibold"
              style={{ background: "#FFFFFF", border: "1.5px solid #EFE7D4", color: "#8A8073" }}
            >
              Cuộn để đọc tiếp
            </span>
            <span className="ml-auto shrink-0 text-[11.5px] font-semibold" style={{ color: "#B5AC9C" }}>
              Bấm số câu ở cuối mỗi part để nhảy sang câu hỏi
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-8 pb-12 pt-[26px]">
            {sortedParts.map((part, partIdx) => (
              <PassagePart
                key={part.id}
                part={part}
                partNumber={partIdx + 1}
                questions={partQuestions.get(part.id) ?? []}
                questionIndex={questionIndex}
                answers={attempt.answers}
                marked={attempt.marked}
                onGoToQuestion={goToQuestion}
              />
            ))}
          </div>
        </div>

        {/* Gáy sách */}
        <div
          className="w-[26px] shrink-0"
          style={{
            background: "linear-gradient(90deg,#EFE4CE 0%,#FBF7EA 42%,#FBF7EA 58%,#EFE4CE 100%)",
            borderLeft: "1.5px solid #EFE7D4",
            borderRight: "1.5px solid #EFE7D4",
          }}
        />

        {/* Trang phải — câu trắc nghiệm */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ background: "#FFFFFF" }}>
          <div
            className="flex shrink-0 items-center gap-3 px-7 py-3.5"
            style={{ background: "#FDFBF3", borderBottom: "1.5px solid #EFE7D4" }}
          >
            <span
              className="text-[10.5px] font-bold uppercase tracking-[0.5px]"
              style={{ color: "#B5AC9C" }}
            >
              Câu trắc nghiệm
            </span>
            <span
              className="rounded-full px-3 py-1 text-[11.5px] font-bold"
              style={{ background: "#EFE7FD", color: "#6B4FB8" }}
            >
              Chọn một đáp án
            </span>
            <span className="ml-auto shrink-0 text-[11.5px] font-semibold" style={{ color: "#B5AC9C" }}>
              {attempt.savedAt ? `Đã tự lưu lúc ${attempt.savedAt}` : "Bài làm được tự lưu"}
            </span>
          </div>

          <div
            ref={rightScrollerRef}
            className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-7 pb-12 pt-[22px]"
          >
            {sortedParts.map((part, partIdx) => {
              const questions = partQuestions.get(part.id) ?? [];
              if (questions.length === 0) return null;
              return (
                <div key={part.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-[13px] font-bold" style={{ color: "#D65F27" }}>
                      PART {partIdx + 1}
                    </span>
                    <span className="text-[12px] font-semibold" style={{ color: "#B5AC9C" }}>
                      {part.title?.trim() || `Phần ${partIdx + 1}`}
                    </span>
                    <span className="h-[1.5px] flex-1" style={{ background: "#EFE7D4" }} />
                  </div>

                  {questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      ref={(el) => {
                        questionRefs.current[question.id] = el;
                      }}
                      question={question}
                      index={questionIndex.get(question.id) ?? 0}
                      answer={attempt.answers[question.id]}
                      marked={attempt.marked.has(question.id)}
                      onSelectOption={attempt.setOptionAnswer}
                      onToggleMark={attempt.toggleMark}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SubmitConfirmDialog
        open={attempt.confirmSubmit}
        onClose={() => attempt.setConfirmSubmit(false)}
        onConfirm={() => {
          attempt.setConfirmSubmit(false);
          attempt.handleSubmit();
        }}
        missing={missingList}
        total={allQuestions.length}
        verb="chưa làm"
      />

      <Modal
        open={attempt.exitWarn !== null && !attempt.autoSubmitted}
        onClose={() => attempt.setExitWarn(null)}
        title="Em vừa rời khỏi màn thi"
        footer={
          <button
            type="button"
            onClick={() => attempt.setExitWarn(null)}
            className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
          >
            Tiếp tục làm bài
          </button>
        }
      >
        {attempt.exitWarn && (
          <div className="text-[14.5px] leading-relaxed text-text-secondary">
            <p>
              Em đã rời khỏi màn làm bài{" "}
              <b className="text-[#C1442F]">
                {attempt.exitWarn.count}/{attempt.exitWarn.limit}
              </b>{" "}
              lần.
            </p>
            <p className="mt-2">
              {attempt.exitWarn.count >= attempt.exitWarn.limit
                ? "Đây là lần cuối được phép — rời thêm một lần nữa, bài sẽ TỰ ĐỘNG NỘP ngay."
                : `Rời khỏi màn thi quá ${attempt.exitWarn.limit} lần thì bài sẽ tự động nộp. Em tập trung làm bài nhé!`}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={attempt.autoSubmitted}
        onClose={attempt.goToResult}
        title="Bài đã được nộp"
        footer={
          <button
            type="button"
            onClick={attempt.goToResult}
            className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
          >
            Xem kết quả
          </button>
        }
      >
        <div className="text-[14.5px] leading-relaxed text-text-secondary">
          <p>
            Em đã rời khỏi màn thi quá{" "}
            <b className="text-[#C1442F]">{attempt.exitLimit}</b> lần cho phép, nên hệ thống đã{" "}
            <b className="text-[#C1442F]">tự động nộp bài</b>.
          </p>
          <p className="mt-2">Em xem lại kết quả nhé.</p>
        </div>
      </Modal>
    </div>
  );
}

/* ── Trang trái: 1 part (nhãn + tên bài đọc + đoạn văn + ô số câu hỏi) ── */

function PassagePart({
  part,
  partNumber,
  questions,
  questionIndex,
  answers,
  marked,
  onGoToQuestion,
}: {
  part: Part;
  partNumber: number;
  questions: Question[];
  questionIndex: Map<number, number>;
  answers: Record<number, Answer>;
  marked: Set<number>;
  onGoToQuestion: (questionId: number) => void;
}) {
  const first = questionIndex.get(questions[0]?.id ?? -1);
  const last = questionIndex.get(questions[questions.length - 1]?.id ?? -1);
  const rangeHint =
    first && last
      ? first === last
        ? `Đọc đoạn văn và trả lời câu ${first}`
        : `Đọc đoạn văn và trả lời câu ${first}–${last}`
      : null;
  const instruction = part.sections.find((s) => s.instruction?.trim())?.instruction ?? rangeHint;

  const paragraphs = part.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((section) => splitParagraphs(section.passage));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className="rounded-full px-3 py-1 font-display text-[11.5px] font-bold"
          style={{ background: "#FDEBDD", color: "#D65F27" }}
        >
          PART {partNumber}
        </span>
        {instruction && (
          <span className="text-[11.5px] font-semibold" style={{ color: "#B5AC9C" }}>
            {instruction}
          </span>
        )}
      </div>

      <h2 className="font-display text-[22px] font-bold" style={{ color: "#3A3330" }}>
        {part.title?.trim() || `Phần ${partNumber}`}
      </h2>

      <div className="flex flex-col gap-3.5">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              fontSize: "15.5px",
              fontWeight: 500,
              lineHeight: 1.95,
              color: "#3A3330",
              textWrap: "pretty",
            }}
          >
            {p}
          </p>
        ))}
      </div>

      {questions.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-3.5 rounded-2xl px-4 py-3.5"
          style={{ background: "#FFFFFF", border: "1.5px solid #EFE7D4" }}
        >
          <span className="font-display text-[13px] font-bold" style={{ color: "#8A8073" }}>
            Part {partNumber}
          </span>
          <div className="flex flex-wrap gap-2">
            {questions.map((question) => (
              <NumberChip
                key={question.id}
                label={questionIndex.get(question.id) ?? 0}
                answered={hasAnswer(answers[question.id])}
                marked={marked.has(question.id)}
                onClick={() => onGoToQuestion(question.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Ô số câu hỏi ở trang trái — bấm để nhảy sang câu ở trang phải; hover viền cam. */
function NumberChip({
  label,
  answered,
  marked,
  onClick,
}: {
  label: number;
  answered: boolean;
  marked: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = chipColors(answered, marked);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl font-display text-sm font-bold transition-colors"
      style={{
        background: colors.background,
        borderWidth: "1.5px",
        borderStyle: "solid",
        borderColor: hovered ? "#F2793B" : colors.border,
        color: colors.color,
      }}
    >
      {label}
    </button>
  );
}

/* ── Trang phải: card câu hỏi (1 đáp án, 1 cột) ── */

function QuestionCard({
  ref,
  question,
  index,
  answer,
  marked,
  onSelectOption,
  onToggleMark,
}: {
  ref: (el: HTMLDivElement | null) => void;
  question: Question;
  index: number;
  answer: Answer | undefined;
  marked: boolean;
  onSelectOption: (questionId: number, optionId: number) => void;
  onToggleMark: (questionId: number) => void;
}) {
  const answered = hasAnswer(answer);
  const numberColors = chipColors(answered, marked);

  return (
    <article
      ref={ref}
      id={`question-${question.id}`}
      className="rounded-[18px] px-5 py-[18px]"
      style={{ background: "#FFFFFF", border: `1.5px solid ${marked ? "#FFC94D" : "#EFE7D4"}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-[31px] shrink-0 items-center justify-center rounded-[11px] font-display text-[13.5px] font-bold"
          style={{ background: numberColors.background, color: numberColors.color }}
        >
          {index}
        </span>

        <p
          className="min-w-0 flex-1 font-display text-[17px] font-bold leading-[1.45]"
          style={{ color: "#3A3330", textWrap: "pretty" }}
        >
          {question.content}
        </p>

        <button
          type="button"
          onClick={() => onToggleMark(question.id)}
          aria-label={marked ? "Bỏ đánh dấu câu hỏi" : "Đánh dấu câu hỏi"}
          aria-pressed={marked}
          className="flex size-8 shrink-0 items-center justify-center rounded-[11px] transition-colors"
          style={
            marked
              ? { background: "#FFF3D3", border: "1.5px solid #FFC94D", color: "#B8860B" }
              : { background: "#FFFFFF", border: "1.5px solid #EFE7D4", color: "#B5AC9C" }
          }
        >
          <FlagIcon />
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-[9px] pl-[43px]">
        {question.options.map((option) => {
          const selected = answer?.question_option_id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectOption(question.id, option.id)}
              aria-pressed={selected}
              className="flex min-h-[48px] items-center gap-[11px] rounded-[15px] px-[14px] py-[11px] text-left transition-colors"
              style={
                selected
                  ? { border: "2px solid #F2793B", background: "#FDEBDD" }
                  : { border: "1.5px solid #EFE7D4", background: "#FFFFFF" }
              }
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-[9px] font-display text-[12.5px] font-bold"
                style={
                  selected
                    ? { background: "#F2793B", color: "#FFFFFF" }
                    : { background: "#F5EFDF", color: "#8A8073" }
                }
              >
                {option.label}
              </span>
              <span
                className="min-w-0 text-[14.5px] leading-[1.5]"
                style={
                  selected
                    ? { fontWeight: 700, color: "#3A3330" }
                    : { fontWeight: 600, color: "#8A8073" }
                }
              >
                {option.content}
              </span>
              {selected && (
                <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold leading-none text-white">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </article>
  );
}
