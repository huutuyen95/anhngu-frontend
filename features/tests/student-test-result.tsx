"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type Option = { id: number; label: string; content: string; is_correct: boolean };

type Question = {
  id: number;
  order: number;
  type: "multiple_choice" | "fill_blank" | "select" | "writing" | "upload";
  content: string;
  audio_url: string | null;
  explanation: string | null;
  options: Option[];
  // Chỉ có ở câu fill_blank — đáp án đúng lưu trên question, không phải options
  correct_answer_text?: string | null;
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

type ResultAnswer = {
  question_id: number;
  question_option_id: number | null;
  answer_text: string | null;
  is_correct: boolean | null;
};

type Result = {
  id: number;
  total_score: number;
  correct_count: number;
  question_count: number;
  is_new_best?: boolean;
  previous_best_score?: number | null;
  // BE chưa trả `started_at` ở endpoint result → ô "THỜI GIAN" hiện "—" khi thiếu.
  started_at?: string | null;
  submitted_at?: string | null;
  test: {
    id: number;
    title: string;
    total_score: number;
    parts: Part[];
  };
  answers: ResultAnswer[];
};

/* ────────────────────────────────────────────────────────────────────────────
   Màn kết quả (S7r): rail trái 360px báo điểm + cột phải chữa từng câu.
   Đây là nơi DUY NHẤT được phép hiện đáp án đúng (`is_correct`, `explanation`).
   3 dạng câu dùng CHUNG một cấu trúc card, chỉ khác dòng đáp án.
   ──────────────────────────────────────────────────────────────────────────── */

/** Kết quả một câu — quyết định màu, badge và dòng đáp án. */
type Verdict = "correct" | "wrong" | "pending";

const VERDICT: Record<
  Verdict,
  { fg: string; bg: string; border: string; badge: string }
> = {
  correct: { fg: "#5E8418", bg: "#F1F8DE", border: "#C6E38A", badge: "Đúng ✓" },
  wrong: { fg: "#C1442F", bg: "#FDE7E2", border: "#F0B5A9", badge: "Sai ✕" },
  pending: { fg: "#B8860B", bg: "#FFF3D3", border: "#FFC94D", badge: "Chờ cô chấm" },
};

/**
 * Nhãn phần. `part.title` đã là "Phần 1"/"Reading"… nên KHÔNG ghép thêm số vào:
 * `part.order` chạy từ 0 nên ghép sẽ ra "Phần 0 · Phần 1". Chỉ khi đề không đặt
 * tiêu đề mới tự sinh số từ `order` (0-based → +1).
 */
function partLabel(part: Pick<Part, "order" | "title">): string {
  const title = part.title?.trim();
  return title || `Phần ${part.order + 1}`;
}

/** Câu tự luận/ghi âm chưa chấm tay → không tính vào điểm tự động. */
function isManualType(type: Question["type"]): boolean {
  return type === "writing" || type === "upload";
}

function verdictOf(question: Question, answer: ResultAnswer | undefined): Verdict {
  if (answer?.is_correct === true) return "correct";
  if (answer?.is_correct === false) return "wrong";
  // Chưa chấm: câu tự luận thì chờ cô, câu tự chấm mà bỏ trống thì tính sai.
  return isManualType(question.type) ? "pending" : "wrong";
}

/** Đáp án đúng của câu: MCQ lấy option đúng; fill_blank lấy mọi cách viết được chấp nhận. */
function correctAnswerLabel(question: Question): string | null {
  const corrects = question.options.filter((o) => o.is_correct);
  if (question.type === "multiple_choice" || question.type === "select") {
    const option = corrects[0];
    return option ? `${option.label} · ${option.content}` : null;
  }
  const accepted = corrects.map((o) => o.content).filter(Boolean);
  if (accepted.length > 0) return accepted.join(" / ");
  return question.correct_answer_text || null;
}

/** Dòng đáp án dưới đề bài — khác nhau theo dạng câu, dùng chung một chỗ dựng. */
function answerLine(
  question: Question,
  answer: ResultAnswer | undefined,
  verdict: Verdict,
): string {
  const correct = correctAnswerLabel(question);

  if (question.type === "multiple_choice" || question.type === "select") {
    const chosen = question.options.find((o) => o.id === answer?.question_option_id);
    if (!chosen) {
      return correct
        ? `Em chưa trả lời câu này — đáp án đúng: ${correct}`
        : "Em chưa trả lời câu này";
    }
    const picked = `Em chọn ${chosen.label} · ${chosen.content}`;
    if (verdict === "correct") return `${picked} — chính xác`;
    return correct ? `${picked} — đáp án đúng: ${correct}` : picked;
  }

  const text = answer?.answer_text?.trim();

  if (question.type === "fill_blank") {
    if (!text) {
      return correct
        ? `Em chưa trả lời câu này — đáp án đúng: "${correct}"`
        : "Em chưa trả lời câu này";
    }
    if (verdict === "correct") return `Em điền "${text}" — chính xác`;
    return correct
      ? `Em điền "${text}" — đáp án đúng: "${correct}"`
      : `Em điền "${text}"`;
  }

  // Trả lời ngắn / tự luận
  if (!text) return "Em chưa trả lời câu này";
  if (verdict === "pending") return `Em trả lời: "${text}"`;
  if (verdict === "correct") return `Em trả lời: "${text}" — chính xác`;
  return correct
    ? `Em trả lời: "${text}" — đáp án gợi ý: "${correct}"`
    : `Em trả lời: "${text}"`;
}

/** Bỏ đuôi .0 cho gọn: 8.5 → "8.5", 9 → "9". */
function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDuration(from?: string | null, to?: string | null): string | null {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Ưu tiên payload trả về ngay từ lúc nộp bài (lưu ở sessionStorage) — vì attempt điểm
// thấp có thể đã bị BE xoá nên không phải lúc nào GET result cũng còn dùng được.
function readStoredResult(attemptId: string): Result | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(`test-result-${attemptId}`);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Result;
  } catch {
    return null;
  }
}

/**
 * Trang kết quả sau khi nộp — nơi DUY NHẤT được phép hiện đáp án đúng.
 * Không nhận `basePath`: rail chỉ có 2 hành động tiếp theo (Nhiệm vụ / Báo cáo),
 * không có đường quay lại danh sách đề nên màn này độc lập với root.
 */
export function StudentTestResult({ attemptId }: { attemptId: string }) {
  const [result, setResult] = useState<Result | null>(() =>
    readStoredResult(attemptId),
  );
  const [error, setError] = useState<string | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);

  useEffect(() => {
    if (readStoredResult(attemptId)) return;

    api<Result>(`/attempts/${attemptId}/result`)
      .then(setResult)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Không tải được kết quả."),
      );
  }, [attemptId]);

  if (error) {
    return <p className="text-sm font-semibold text-[#C1442F]">{error}</p>;
  }

  if (!result) {
    return <p className="text-sm text-text-secondary">Đang tải...</p>;
  }

  const answersByQuestion = new Map(
    result.answers.map((answer) => [answer.question_id, answer]),
  );

  const sortedParts = result.test.parts.slice().sort((a, b) => a.order - b.order);
  const allQuestions = sortedParts
    .flatMap((part) => part.sections.slice().sort((a, b) => a.order - b.order))
    .flatMap((section) => section.questions.slice().sort((a, b) => a.order - b.order));

  // Số thứ tự chạy suốt đề — giữ nguyên kể cả khi lọc "chỉ xem câu sai".
  const questionIndex = new Map(allQuestions.map((q, i) => [q.id, i + 1]));
  const verdicts = new Map(
    allQuestions.map((q) => [q.id, verdictOf(q, answersByQuestion.get(q.id))]),
  );

  const total = allQuestions.length;
  const wrongCount = allQuestions.filter((q) => verdicts.get(q.id) === "wrong").length;
  const pendingCount = allQuestions.filter(
    (q) => verdicts.get(q.id) === "pending",
  ).length;
  const correctCount = allQuestions.filter(
    (q) => verdicts.get(q.id) === "correct",
  ).length;
  const gradedCount = total - pendingCount;
  const hasExplanation = allQuestions.some((q) => q.explanation);

  const maxScore = result.test.total_score || 10;
  const score = result.total_score ?? 0;
  const scoreRatio = maxScore > 0 ? Math.min(1, Math.max(0, score / maxScore)) : 0;
  const scoreOn10 = scoreRatio * 10;
  const perQuestion = total > 0 ? maxScore / total : 0;

  const tier: Verdict =
    scoreOn10 >= 8 ? "correct" : scoreOn10 >= 5 ? "pending" : "wrong";
  const praise =
    scoreOn10 >= 8 ? "Tuyệt vời!" : scoreOn10 >= 5 ? "Khá rồi!" : "Cần cố thêm!";
  const summaryBadge =
    pendingCount > 0
      ? `Đã chấm tự động ${gradedCount}/${total} câu · ${pendingCount} câu chờ cô`
      : `${praise} ${correctCount}/${total} câu đúng`;

  const duration = formatDuration(result.started_at, result.submitted_at);

  return (
    <div className="flex items-start gap-7 pb-2">
      {/* ── Rail trái: điểm + hành động tiếp theo ── */}
      <aside className="flex w-[360px] shrink-0 flex-col gap-[18px]">
        <div className="rounded-[20px] border-[1.5px] border-border bg-surface p-7 text-center">
          <p className="mb-5 truncate text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
            {result.test.title}
          </p>

          <div
            className="mx-auto flex size-[150px] items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#F2793B 0 ${scoreRatio * 360}deg, #F5EFDF ${
                scoreRatio * 360
              }deg 360deg)`,
            }}
          >
            <div className="flex size-[118px] flex-col items-center justify-center rounded-full bg-surface">
              <span className="font-display text-[38px] font-bold leading-none text-text">
                {formatScore(score)}
              </span>
              <span className="mt-1.5 text-[11px] font-bold text-text-secondary">
                / {formatScore(maxScore)} điểm
              </span>
            </div>
          </div>

          <p
            className="mt-[18px] inline-block rounded-full px-4 py-[7px] text-[13px] font-bold"
            style={{ background: VERDICT[tier].bg, color: VERDICT[tier].fg }}
          >
            {summaryBadge}
          </p>

          <div className="mt-5 flex gap-2.5">
            <Stat value={`${formatScore(perQuestion)}đ`} label="Mỗi câu" />
            <Stat value={duration ?? "—"} label="Thời gian" />
            <Stat value={String(wrongCount)} label="Câu sai" />
          </div>

          {result.is_new_best === false && result.previous_best_score != null && (
            <p className="mt-4 text-xs font-medium leading-[1.55] text-text-secondary">
              Điểm lần này thấp hơn kỷ lục ({formatScore(result.previous_best_score)}đ)
              nên hệ thống giữ điểm cao nhất.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/missions"
            className="flex h-[46px] items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none"
          >
            Về Nhiệm vụ
          </Link>
          {/* /reports chưa có page — để "Sắp có" thay vì điều hướng ra 404. */}
          <button
            type="button"
            disabled
            title="Sắp có"
            className="flex h-[46px] items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-sm font-bold text-text-muted"
          >
            Xem báo cáo của em
          </button>
        </div>
      </aside>

      {/* ── Cột phải: chữa bài ── */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3">
          <h1 className="font-display text-xl font-bold text-text">Chữa bài</h1>
          <p className="text-[13px] font-semibold text-text-secondary">
            {total} câu · {wrongCount} câu sai
            {hasExplanation && " · có lời giải"}
          </p>
          <button
            type="button"
            onClick={() => setOnlyWrong((v) => !v)}
            aria-pressed={onlyWrong}
            className="ml-auto shrink-0 text-[13px] font-bold text-brand-bold hover:underline"
          >
            {onlyWrong ? "Xem tất cả câu" : "Chỉ xem câu sai"}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {sortedParts.flatMap((part) =>
            part.sections
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((section) => {
                const questions = section.questions
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .filter((q) => !onlyWrong || verdicts.get(q.id) === "wrong");
                if (questions.length === 0) return null;

                const hasContext =
                  section.instruction || section.passage || section.audio_url;

                return (
                  <div key={section.id} className="flex flex-col gap-3">
                    {hasContext && (
                      <div className="rounded-[18px] border-[1.5px] border-border bg-surface-alt px-5 py-[18px]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
                          {partLabel(part)}
                        </p>
                        {section.instruction && (
                          <p className="mt-2 font-display text-[15px] font-bold text-text">
                            {section.instruction}
                          </p>
                        )}
                        {section.passage && (
                          <p className="mt-2 whitespace-pre-line text-[13px] font-medium leading-[1.65] text-text-secondary">
                            {section.passage}
                          </p>
                        )}
                        {section.audio_url && (
                          <audio controls src={section.audio_url} className="mt-3 w-full" />
                        )}
                      </div>
                    )}

                    {questions.map((question) => (
                      <ReviewCard
                        key={question.id}
                        question={question}
                        index={questionIndex.get(question.id) ?? question.order}
                        answer={answersByQuestion.get(question.id)}
                        verdict={verdicts.get(question.id) ?? "wrong"}
                      />
                    ))}
                  </div>
                );
              }),
          )}

          {onlyWrong && wrongCount === 0 && (
            <p className="rounded-[18px] border-[1.5px] border-border bg-surface px-5 py-6 text-center text-[13px] font-semibold text-text-secondary">
              Em không sai câu nào cả — không có gì để lọc.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-[14px] bg-surface-alt p-3">
      <p className="font-display text-[17px] font-bold leading-none text-text">{value}</p>
      <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.5px] text-text-secondary">
        {label}
      </p>
    </div>
  );
}

/** Card chữa 1 câu — CHUNG cho cả 3 dạng, chỉ khác nội dung dòng đáp án. */
function ReviewCard({
  question,
  index,
  answer,
  verdict,
}: {
  question: Question;
  index: number;
  answer: ResultAnswer | undefined;
  verdict: Verdict;
}) {
  const style = VERDICT[verdict];

  return (
    <article
      className="rounded-[18px] bg-surface px-5 py-[18px]"
      style={{ border: `1.5px solid ${style.border}` }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-[26px] shrink-0 items-center justify-center rounded-lg text-xs font-bold"
          style={{ background: style.bg, color: style.fg }}
        >
          {index}
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-bold leading-[1.4] text-text [text-wrap:pretty]">
          {question.content}
        </p>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold"
          style={{ background: style.bg, color: style.fg }}
        >
          {style.badge}
        </span>
      </div>

      {question.audio_url && (
        <audio controls src={question.audio_url} className="mt-2.5 w-full" />
      )}

      <p
        className="mt-2.5 text-[13px] font-semibold leading-[1.5]"
        style={{ color: style.fg }}
      >
        {answerLine(question, answer, verdict)}
      </p>

      {verdict === "pending" ? (
        <p className="mt-3 text-[13px] font-medium text-text-secondary">
          Cô sẽ chấm và gửi nhận xét cho em trong 24h.
        </p>
      ) : (
        verdict === "wrong" &&
        question.explanation && (
          <div className="mt-3 rounded-[14px] bg-surface-alt p-3.5 text-[13px] font-medium leading-[1.65] text-text-secondary">
            <b className="text-text">Lời giải:</b> {question.explanation}
          </div>
        )
      )}
    </article>
  );
}
