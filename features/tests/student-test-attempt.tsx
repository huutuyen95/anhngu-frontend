"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SubmitConfirmDialog, missingNumbers } from "@/features/tests/submit-confirm";
import { ExitWarnDialog, AutoSubmittedDialog } from "@/features/tests/exit-warn-dialog";
import { SKILL_LABEL } from "@/lib/types/test";
import {
  useTestAttempt,
  hasAnswer,
  partLabel,
  formatRemaining,
  type Answer,
  type Question,
  type TestDetail,
  type TestAttemptState,
} from "@/features/tests/use-test-attempt";
import { OriginChip } from "@/features/tests/attempt-origin";
import { ReadingTestAttempt } from "@/features/tests/reading-test-attempt";
import { SpeakingTestAttempt } from "@/features/tests/speaking-test-attempt";
import { WritingTestAttempt } from "@/features/tests/writing-test-attempt";

/* ────────────────────────────────────────────────────────────────────────────
   Màn làm bài (S7). Đề hỗn hợp: 3 dạng câu dùng CHUNG một cấu trúc card, chỉ
   khác badge + vùng trả lời:
     - trắc nghiệm  (multiple_choice, select) → lưới 2 cột ô đáp án
     - điền từ      (fill_blank)              → ô nhập nằm giữa câu văn
     - trả lời ngắn (writing)                 → ô nhập rộng hết dòng

   Toàn bộ câu hỏi nằm trong MỘT khung cuộn cao cố định 640px; đồng hồ, lưới câu
   và nút Nộp bài ở rail phải sticky nên luôn trong tầm mắt. Không phân trang
   từng câu, không nút "Câu trước/Câu sau".

   Đề kỹ năng Đọc (S7d) dùng layout khác hẳn — trang sách 2 cột toàn màn hình,
   xem `reading-test-attempt.tsx`. Đề kỹ năng Viết (S8) cũng khác hẳn — một cột,
   mỗi câu một khung khép kín có trình soạn thảo riêng, xem `writing-test-attempt.tsx`.
   Logic vòng đời lượt làm (tải đề, autosave, đếm giờ, chống thoát tab, nộp bài)
   dùng CHUNG qua `useTestAttempt`.
   ──────────────────────────────────────────────────────────────────────────── */

/** 3 dạng trả lời hiển thị — gom từ `QuestionType` của backend. */
type AnswerForm = "choice" | "blank" | "short";

const FORM_META: Record<AnswerForm, { label: string; hint: string; fg: string; bg: string }> = {
  choice: { label: "Trắc nghiệm", hint: "Chọn một đáp án", fg: "#6B4FB8", bg: "#EFE7FD" },
  blank: { label: "Điền từ", hint: "Điền một từ vào chỗ trống", fg: "#2380A8", bg: "#E4F5FD" },
  short: { label: "Trả lời ngắn", hint: "Viết câu trả lời của em", fg: "#5E8418", bg: "#F1F8DE" },
};

const FORM_ORDER: AnswerForm[] = ["choice", "blank", "short"];

function answerForm(type: Question["type"]): AnswerForm {
  if (type === "multiple_choice" || type === "select") return "choice";
  if (type === "fill_blank") return "blank";
  return "short";
}

/** Viền/nền ô nhập: đã có nội dung → cam; còn trống → be nhạt. */
function fieldStyle(filled: boolean) {
  return filled
    ? { border: "1.5px solid #F2793B", background: "#FDEBDD" }
    : { border: "1.5px solid #EFE7D4", background: "#FDFBF3" };
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M5 21V4m0 0h11l-1.6 3.6L16 11H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Màn làm bài. Dùng lại cho mọi root (thư viện, lớp học) — nộp xong chuyển sang
 * trang kết quả cùng root, tính theo `basePath` chứ không hardcode "/library".
 */
export function StudentTestAttempt({
  basePath,
  testId: id,
  attemptId,
}: {
  basePath: string;
  testId: string;
  attemptId: string;
}) {
  const attempt = useTestAttempt({ basePath, testId: id, attemptId });

  if (attempt.attemptGone) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-[20px] border-[1.5px] border-border bg-surface px-8 py-12 text-center">
        <h1 className="font-display text-[22px] font-bold text-text">Lượt làm bài không còn nữa</h1>
        <p className="text-[14.5px] leading-relaxed text-text-secondary">
          Lượt làm bài này đã kết thúc hoặc được thay bằng một lượt mới (có thể em đã mở lại đề ở
          nơi khác). Em quay lại danh sách đề và bắt đầu lại nhé.
        </p>
        <Link
          href={attempt.routes.list}
          className="mt-1 inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
        >
          Về danh sách đề
        </Link>
      </div>
    );
  }

  if (attempt.error && !attempt.test) {
    return <p className="text-sm text-[#C1442F]">{attempt.error}</p>;
  }

  if (!attempt.test) {
    return <p className="text-sm text-text-secondary">Đang tải...</p>;
  }

  if (attempt.test.skill === "reading") {
    return <ReadingTestAttempt attempt={attempt} test={attempt.test} />;
  }

  if (attempt.test.skill === "writing") {
    return <WritingTestAttempt attempt={attempt} test={attempt.test} />;
  }

  // Đề Nói có màn riêng (ghi âm + ảnh gợi ý). Không có nhánh này thì câu speaking rơi
  // vào layout đề hỗn hợp và bị render thành ô nhập text.
  if (attempt.test.skill === "speaking") {
    return <SpeakingTestAttempt attempt={attempt} test={attempt.test} />;
  }

  return <DefaultTestAttempt attempt={attempt} test={attempt.test} />;
}

function DefaultTestAttempt({ attempt, test }: { attempt: TestAttemptState; test: TestDetail }) {
  const { routes } = attempt;

  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  /** Cuộn tới câu — cuộn BÊN TRONG khung, không cuộn cả trang. */
  function goToQuestion(questionId: number) {
    const el = questionRefs.current[questionId];
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - 22), behavior: "smooth" });
  }

  const sortedParts = test.parts.slice().sort((a, b) => a.order - b.order);
  const allQuestions = sortedParts
    .flatMap((part) => part.sections.slice().sort((a, b) => a.order - b.order))
    .flatMap((section) => section.questions.slice().sort((a, b) => a.order - b.order));
  const questionIndex = new Map(allQuestions.map((q, i) => [q.id, i + 1]));

  const answeredCount = allQuestions.filter((q) => hasAnswer(attempt.answers[q.id])).length;
  // Danh sách câu còn trống — hiện rõ trong hộp xác nhận nộp bài để em không bỏ sót.
  const missingList = missingNumbers(allQuestions, (q) => hasAnswer(attempt.answers[q.id]));

  const forms = new Set(allQuestions.map((q) => answerForm(q.type)));
  const formChip = FORM_ORDER.filter((f) => forms.has(f))
    .map((f) => FORM_META[f].label)
    .join(" · ");

  const skillLabel = test.skill === "mixed" ? "Đề hỗn hợp" : SKILL_LABEL[test.skill] ?? "Đề thi";
  const headerBadge = `${skillLabel} · ${allQuestions.length} câu`.toUpperCase();

  const remainingMs = attempt.deadline ? Math.max(0, attempt.deadline - attempt.now) : null;
  const totalMs = test.duration_minutes > 0 ? test.duration_minutes * 60_000 : null;
  const remainingRatio =
    remainingMs !== null && totalMs ? Math.min(1, Math.max(0, remainingMs / totalMs)) : null;
  const urgent = remainingMs !== null && remainingMs < 5 * 60_000;

  return (
    <div className="flex items-start gap-7 pb-2">
      {/* ── Cột trái: tiêu đề + khung cuộn câu hỏi ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href={routes.list}
            className="shrink-0 text-[13px] font-bold text-text-secondary transition-colors hover:text-text"
          >
            ← Thoát
          </Link>
          <h1 className="min-w-0 truncate font-display text-[22px] font-bold leading-tight text-text">
            {test.title}
          </h1>
          <span className="shrink-0 rounded-full bg-brand-soft px-3 py-[5px] text-xs font-bold text-brand-bold">
            {headerBadge}
          </span>
          {/* Đang làm bài cô giao hay tự luyện — hai luồng dùng chung màn này. */}
          <OriginChip origin={attempt.origin} />
        </div>

        {attempt.error && <p className="text-sm font-semibold text-[#C1442F]">{attempt.error}</p>}

        <div className="flex h-[640px] flex-col overflow-hidden rounded-[20px] border-[1.5px] border-border bg-surface">
          {/* Header khung cuộn */}
          <div className="flex shrink-0 items-center gap-3 border-b-[1.5px] border-border bg-surface-alt px-[22px] py-4">
            <span className="shrink-0 text-[12.5px] font-bold text-text-secondary">
              Cuộn để xem toàn bộ câu hỏi
            </span>
            {formChip && (
              <span className="truncate rounded-full border-[1.5px] border-border bg-surface px-3 py-1 text-[11.5px] font-semibold text-text-secondary">
                {formChip}
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs font-semibold text-text-muted">
              {attempt.savedAt ? `Đã tự lưu lúc ${attempt.savedAt}` : "Bài làm được tự lưu"}
            </span>
          </div>

          {/* Vùng cuộn */}
          <div
            ref={scrollerRef}
            className="relative flex flex-1 flex-col gap-3.5 overflow-y-auto p-[22px]"
          >
            {sortedParts.map((part) =>
              part.sections
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <div key={section.id} className="flex flex-col gap-3.5">
                    {(section.instruction || section.passage || section.audio_url) && (
                      <div className="rounded-[18px] border-[1.5px] border-border bg-surface-alt px-[22px] py-[18px]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
                          {partLabel(part)}
                        </p>
                        {section.instruction && (
                          <p className="mt-2 font-display text-[15px] font-bold text-text">
                            {section.instruction}
                          </p>
                        )}
                        {section.passage && (
                          <p className="mt-2 whitespace-pre-line text-[14.5px] font-medium leading-relaxed text-text-secondary">
                            {section.passage}
                          </p>
                        )}
                        {section.audio_url && (
                          <audio controls src={section.audio_url} className="mt-3 w-full" />
                        )}
                      </div>
                    )}

                    {section.questions
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((question) => (
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
                          onChangeText={attempt.setTextAnswer}
                          onToggleMark={attempt.toggleMark}
                        />
                      ))}
                  </div>
                )),
            )}
          </div>
        </div>
      </div>

      {/* ── Rail phải: đồng hồ · lưới câu hỏi · nộp bài ── */}
      <aside className="sticky top-[100px] flex w-[320px] shrink-0 flex-col gap-4">
        {/* Đồng hồ */}
        <div className="rounded-[20px] border-[1.5px] border-border bg-surface p-[22px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
            Thời gian còn lại
          </p>
          {remainingMs !== null ? (
            <>
              <p
                className="mt-1.5 font-display text-[40px] font-bold leading-none tabular-nums"
                style={{ color: urgent ? "#C1442F" : "#3A3330" }}
              >
                {formatRemaining(remainingMs)}
              </p>
              {remainingRatio !== null && (
                <div className="mt-4 h-[7px] w-full overflow-hidden rounded-full bg-[#F0EADA]">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear"
                    style={{ width: `${remainingRatio * 100}%` }}
                  />
                </div>
              )}
              <p className="mt-3 text-xs font-semibold text-text-secondary">
                Hết giờ hệ thống tự nộp bài
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-[22px] font-bold leading-none text-text">
                Không giới hạn
              </p>
              <p className="mt-3 text-xs font-semibold text-text-secondary">
                Em làm xong thì bấm Nộp bài
              </p>
            </>
          )}
        </div>

        {/* Cảnh báo chống thoát tab */}
        {attempt.exitLimit !== null && (
          <div
            className="rounded-[20px] border-[1.5px] px-[22px] py-3.5"
            style={
              attempt.exitCount >= attempt.exitLimit
                ? { borderColor: "#E5604C", background: "#FDE7E2" }
                : attempt.exitCount > 0
                  ? { borderColor: "#FFC94D", background: "#FFF3D3" }
                  : { borderColor: "#EFE7D4", background: "#FFFFFF" }
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
                Số lần rời màn thi
              </span>
              <span
                className="font-display text-sm font-bold tabular-nums"
                style={{ color: attempt.exitCount >= attempt.exitLimit ? "#C1442F" : "#3A3330" }}
              >
                {attempt.exitCount}/{attempt.exitLimit}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] font-semibold text-text-secondary">
              Rời quá {attempt.exitLimit} lần, bài sẽ tự động nộp.
            </p>
          </div>
        )}

        {/* Lưới câu hỏi */}
        <div className="rounded-[20px] border-[1.5px] border-border bg-surface p-[22px]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
              Lưới câu hỏi
            </p>
            <p className="font-display text-sm font-bold text-text">
              {answeredCount}/{allQuestions.length}
            </p>
          </div>

          <div className="mt-3.5 grid grid-cols-5 gap-2">
            {allQuestions.map((question) => {
              const answered = hasAnswer(attempt.answers[question.id]);
              const isMarked = attempt.marked.has(question.id);
              const style = answered
                ? { background: "#FDEBDD", border: "1.5px solid #FDEBDD", color: "#D65F27" }
                : isMarked
                  ? { background: "#FFF3D3", border: "1.5px solid #FFC94D", color: "#B8860B" }
                  : { background: "#FFFFFF", border: "1.5px solid #EFE7D4", color: "#8A8073" };
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goToQuestion(question.id)}
                  className="flex h-[38px] items-center justify-center rounded-xl font-display text-sm font-bold transition-transform active:scale-95"
                  style={style}
                >
                  {questionIndex.get(question.id)}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Legend background="#FDEBDD" border="#FDEBDD" label="Đã trả lời" />
            <Legend background="#FFF3D3" border="#FFC94D" label="Đánh dấu" />
            <Legend background="#FFFFFF" border="#EFE7D4" label="Chưa làm" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => attempt.setConfirmSubmit(true)}
          disabled={attempt.submitting}
          className="h-[50px] w-full rounded-full bg-brand text-[15px] font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none disabled:opacity-60"
        >
          {attempt.submitting ? "Đang nộp..." : "Nộp bài"}
        </button>
      </aside>

      <SubmitConfirmDialog
        open={attempt.confirmSubmit}
        onClose={() => attempt.setConfirmSubmit(false)}
        onConfirm={() => {
          attempt.setConfirmSubmit(false);
          attempt.handleSubmit();
        }}
        missing={missingList}
        total={allQuestions.length}
      />

      {/* Cảnh báo khi học sinh quay lại sau khi rời tab (không hiện nếu đã tự nộp). */}
      <ExitWarnDialog
        open={attempt.exitWarn !== null && !attempt.autoSubmitted}
        onClose={() => attempt.setExitWarn(null)}
        count={attempt.exitWarn?.count ?? 0}
        limit={attempt.exitWarn?.limit ?? attempt.exitLimit}
        action={attempt.exitAction}
      />

      {/* Popup báo đã tự động nộp vì rời quá số lần cho phép. */}
      <AutoSubmittedDialog
        open={attempt.autoSubmitted}
        onClose={attempt.goToResult}
        limit={attempt.exitLimit}
      />
    </div>
  );
}

function Legend({
  background,
  border,
  label,
}: {
  background: string;
  border: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2 text-[12px] font-semibold text-text-secondary">
      <span
        className="size-[15px] shrink-0 rounded-md"
        style={{ background, border: `1.5px solid ${border}` }}
      />
      {label}
    </span>
  );
}

/* ── Card câu hỏi: CHUNG cho cả 3 dạng, chỉ khác badge + vùng trả lời ── */

function QuestionCard({
  ref,
  question,
  index,
  answer,
  marked,
  onSelectOption,
  onChangeText,
  onToggleMark,
}: {
  ref: (el: HTMLDivElement | null) => void;
  question: Question;
  index: number;
  answer: Answer | undefined;
  marked: boolean;
  onSelectOption: (questionId: number, optionId: number) => void;
  onChangeText: (questionId: number, text: string) => void;
  onToggleMark: (questionId: number) => void;
}) {
  const form = answerForm(question.type);
  const meta = FORM_META[form];
  const answered = hasAnswer(answer);
  const text = answer?.answer_text ?? "";

  const numberStyle = answered
    ? { background: "#FDEBDD", color: "#D65F27" }
    : marked
      ? { background: "#FFF3D3", color: "#B8860B" }
      : { background: "#F5EFDF", color: "#8A8073" };

  return (
    <article
      ref={ref}
      id={`question-${question.id}`}
      className="rounded-[18px] bg-surface px-[22px] py-5"
      style={{ border: `1.5px solid ${marked ? "#FFC94D" : "#EFE7D4"}` }}
    >
      <div className="flex items-start gap-[13px]">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-[11px] font-display text-sm font-bold"
          style={numberStyle}
        >
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-[7px] flex flex-wrap items-center gap-[9px]">
            <span
              className="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
              style={{ background: meta.bg, color: meta.fg }}
            >
              {meta.label}
            </span>
            <span className="text-[11.5px] font-semibold text-text-muted">{meta.hint}</span>
          </div>
          <p className="font-display text-[18px] font-bold leading-[1.4] text-text [text-wrap:pretty]">
            {question.content}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleMark(question.id)}
          aria-label={marked ? "Bỏ đánh dấu câu hỏi" : "Đánh dấu câu hỏi"}
          aria-pressed={marked}
          className="flex size-[34px] shrink-0 items-center justify-center rounded-xl transition-colors"
          style={
            marked
              ? { background: "#FFF3D3", border: "1.5px solid #FFC94D", color: "#B8860B" }
              : { background: "#FFFFFF", border: "1.5px solid #EFE7D4", color: "#B5AC9C" }
          }
        >
          <FlagIcon />
        </button>
      </div>

      {question.audio_url && (
        <audio controls src={question.audio_url} className="mt-4 w-full pl-[45px]" />
      )}

      {/* Vùng trả lời — thụt lề thẳng hàng với đề bài */}
      <div className="mt-4 pl-[45px]">
        {form === "choice" && (
          <div className="grid grid-cols-2 gap-2.5">
            {question.options.map((option) => {
              const selected = answer?.question_option_id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption(question.id, option.id)}
                  aria-pressed={selected}
                  className="flex min-h-[52px] min-w-0 items-center gap-3 rounded-[15px] px-[15px] py-[13px] text-left transition-colors"
                  style={
                    selected
                      ? { border: "2px solid #F2793B", background: "#FDEBDD" }
                      : { border: "1.5px solid #EFE7D4", background: "#FFFFFF" }
                  }
                >
                  <span
                    className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] font-display text-[13px] font-bold"
                    style={
                      selected
                        ? { background: "#F2793B", color: "#FFFFFF" }
                        : { background: "#F5EFDF", color: "#8A8073" }
                    }
                  >
                    {option.label}
                  </span>
                  <span
                    className="min-w-0 text-[14.5px]"
                    style={
                      selected
                        ? { fontWeight: 700, color: "#3A3330" }
                        : { fontWeight: 600, color: "#8A8073" }
                    }
                  >
                    {option.content}
                  </span>
                  {selected && (
                    <span className="ml-auto flex size-[21px] shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold leading-none text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {form === "blank" && (
          <input
            type="text"
            value={text}
            onChange={(e) => onChangeText(question.id, e.target.value)}
            aria-label={`Đáp án câu ${index}`}
            placeholder="Điền từ…"
            className="h-11 w-[150px] rounded-[14px] text-center font-sans text-[15px] font-bold text-brand-bold outline-none placeholder:text-[13px] placeholder:font-semibold placeholder:text-text-muted"
            style={fieldStyle(answered)}
          />
        )}

        {form === "short" && (
          <ShortAnswerInput
            value={text}
            filled={answered}
            label={`Câu trả lời câu ${index}`}
            onChange={(value) => onChangeText(question.id, value)}
          />
        )}
      </div>
    </article>
  );
}

/**
 * Ô trả lời ngắn: bắt đầu đúng 1 dòng (48px) như đặc tả, tự cao thêm khi em viết
 * dài — câu `writing` có thể vài dòng, ép 1 dòng cứng thì gõ xong không đọc lại được.
 */
function ShortAnswerInput({
  value,
  filled,
  label,
  onChange,
}: {
  value: string;
  filled: boolean;
  label: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(48, el.scrollHeight)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Nhập câu trả lời của em…"
      className="box-border h-12 w-full resize-none rounded-[15px] px-4 py-[13px] font-sans text-[15px] font-semibold leading-[22px] text-text outline-none placeholder:font-medium placeholder:text-text-muted"
      style={fieldStyle(filled)}
    />
  );
}
