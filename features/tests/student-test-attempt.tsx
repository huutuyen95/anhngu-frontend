"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { testRoutes } from "@/features/tests/routes";
import { SKILL_LABEL, type Skill } from "@/lib/types/test";

type Option = { id: number; label: string; content: string };

type Question = {
  id: number;
  order: number;
  type: "multiple_choice" | "fill_blank" | "select" | "writing" | "upload";
  content: string;
  audio_url: string | null;
  options: Option[];
};

type Section = {
  id: number;
  instruction: string | null;
  passage: string | null;
  audio_url: string | null;
  order: number;
  questions: Question[];
};

type Part = {
  id: number;
  title: string;
  order: number;
  sections: Section[];
};

type TestDetail = {
  id: number;
  title: string;
  skill: Skill;
  duration_minutes: number;
  total_score: number;
  parts: Part[];
};

type Answer = { question_id: number; question_option_id?: number; answer_text?: string };

/* ────────────────────────────────────────────────────────────────────────────
   Màn làm bài (S7). Đề hỗn hợp: 3 dạng câu dùng CHUNG một cấu trúc card, chỉ
   khác badge + vùng trả lời:
     - trắc nghiệm  (multiple_choice, select) → lưới 2 cột ô đáp án
     - điền từ      (fill_blank)              → ô nhập nằm giữa câu văn
     - trả lời ngắn (writing)                 → ô nhập rộng hết dòng

   Toàn bộ câu hỏi nằm trong MỘT khung cuộn cao cố định 640px; đồng hồ, lưới câu
   và nút Nộp bài ở rail phải sticky nên luôn trong tầm mắt. Không phân trang
   từng câu, không nút "Câu trước/Câu sau".
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

/**
 * Nhãn phần. `part.title` đã là "Phần 1"/"Reading"… nên KHÔNG ghép thêm số vào:
 * `part.order` chạy từ 0 nên ghép sẽ ra "Phần 0 · Phần 1". Chỉ khi đề không đặt
 * tiêu đề mới tự sinh số từ `order` (0-based → +1).
 */
function partLabel(part: Pick<Part, "order" | "title">): string {
  const title = part.title?.trim();
  return title || `Phần ${part.order + 1}`;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function hasAnswer(answer: Answer | undefined): boolean {
  if (!answer) return false;
  if (answer.question_option_id !== undefined) return true;
  return !!answer.answer_text && answer.answer_text.trim() !== "";
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
  const router = useRouter();
  const routes = useMemo(() => testRoutes(basePath), [basePath]);
  const searchParams = useSearchParams();
  const deadlineParam = searchParams.get("deadline");

  const [test, setTest] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const deadline = deadlineParam ? new Date(deadlineParam).getTime() : null;

  useEffect(() => {
    api<TestDetail>(`/tests/${id}`)
      .then(setTest)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Không tải được đề thi."),
      );
  }, [id]);

  function buildAnswersPayload(): Answer[] {
    return Object.values(answersRef.current);
  }

  const saveAnswers = useCallback(async () => {
    const payload = buildAnswersPayload();
    if (payload.length === 0 || submittedRef.current) return;
    try {
      await api(`/attempts/${attemptId}/answers`, {
        method: "PUT",
        body: JSON.stringify({ answers: payload }),
      });
      setSavedAt(formatClock(new Date()));
    } catch {
      // Bỏ qua lỗi auto-save tạm thời — vẫn còn cơ hội lưu ở lần nộp bài cuối
    }
  }, [attemptId]);

  async function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await api(`/attempts/${attemptId}/answers`, {
        method: "PUT",
        body: JSON.stringify({ answers: buildAnswersPayload() }),
      });
      const result = await api(`/attempts/${attemptId}/submit`, { method: "POST" });
      try {
        sessionStorage.setItem(`test-result-${attemptId}`, JSON.stringify(result));
      } catch {
        // sessionStorage có thể đầy/bị chặn — không chặn luồng nộp bài, trang kết quả
        // sẽ fallback sang gọi GET /attempts/{id}/result
      }
      router.push(routes.result(id, attemptId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không nộp được bài.");
      submittedRef.current = false;
      setSubmitting(false);
    }
  }

  // Đồng hồ đếm ngược, tự nộp khi hết giờ
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  // Auto-save sau mỗi lựa chọn / mỗi lần gõ (gộp 1.2s để không bắn request mỗi ký tự).
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const timer = setTimeout(() => saveAnswers(), 1200);
    return () => clearTimeout(timer);
  }, [answers, saveAnswers]);

  function setOptionAnswer(questionId: number, optionId: number) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { question_id: questionId, question_option_id: optionId },
    }));
  }

  function setTextAnswer(questionId: number, text: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { question_id: questionId, answer_text: text },
    }));
  }

  function toggleMark(questionId: number) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  /** Cuộn tới câu — cuộn BÊN TRONG khung, không cuộn cả trang. */
  function goToQuestion(questionId: number) {
    const el = questionRefs.current[questionId];
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - 22), behavior: "smooth" });
  }

  if (error && !test) {
    return <p className="text-sm text-[#C1442F]">{error}</p>;
  }

  if (!test) {
    return <p className="text-sm text-text-secondary">Đang tải...</p>;
  }

  const sortedParts = test.parts.slice().sort((a, b) => a.order - b.order);
  const allQuestions = sortedParts
    .flatMap((part) => part.sections.slice().sort((a, b) => a.order - b.order))
    .flatMap((section) => section.questions.slice().sort((a, b) => a.order - b.order));
  const questionIndex = new Map(allQuestions.map((q, i) => [q.id, i + 1]));

  const answeredCount = allQuestions.filter((q) => hasAnswer(answers[q.id])).length;

  const forms = new Set(allQuestions.map((q) => answerForm(q.type)));
  const formChip = FORM_ORDER.filter((f) => forms.has(f))
    .map((f) => FORM_META[f].label)
    .join(" · ");

  const skillLabel = test.skill === "mixed" ? "Đề hỗn hợp" : SKILL_LABEL[test.skill] ?? "Đề thi";
  const headerBadge = `${skillLabel} · ${allQuestions.length} câu`.toUpperCase();

  const remainingMs = deadline ? Math.max(0, deadline - now) : null;
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
        </div>

        {error && <p className="text-sm font-semibold text-[#C1442F]">{error}</p>}

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
              {savedAt ? `Đã tự lưu lúc ${savedAt}` : "Bài làm được tự lưu"}
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
                          answer={answers[question.id]}
                          marked={marked.has(question.id)}
                          onSelectOption={setOptionAnswer}
                          onChangeText={setTextAnswer}
                          onToggleMark={toggleMark}
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
              const answered = hasAnswer(answers[question.id]);
              const isMarked = marked.has(question.id);
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
          onClick={() => setConfirmSubmit(true)}
          disabled={submitting}
          className="h-[50px] w-full rounded-full bg-brand text-[15px] font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none disabled:opacity-60"
        >
          {submitting ? "Đang nộp..." : "Nộp bài"}
        </button>
      </aside>

      <ConfirmDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => {
          setConfirmSubmit(false);
          handleSubmit();
        }}
        title="Nộp bài?"
        confirmLabel="Nộp bài"
        description={
          answeredCount < allQuestions.length
            ? `Em còn ${allQuestions.length - answeredCount} câu chưa làm — câu bỏ trống tính 0 điểm. Nộp bài luôn?`
            : "Em chắc chắn muốn nộp bài? Sau khi nộp sẽ không sửa được nữa."
        }
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
