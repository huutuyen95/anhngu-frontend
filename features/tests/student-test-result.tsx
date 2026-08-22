"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { startAttempt } from "@/lib/api/tests";
import { testRoutes } from "@/features/tests/routes";
import {
  AttemptsNote,
  BackButton,
  OriginBanner,
  hasAttemptsLeft,
  isAssignment,
  type AttemptMission,
  type AttemptSource,
} from "@/features/tests/attempt-origin";
import { htmlToText } from "@/lib/sanitize";

type Option = { id: number; label: string; content: string; is_correct: boolean };

type Question = {
  id: number;
  order: number;
  type: "multiple_choice" | "fill_blank" | "select" | "writing" | "speaking" | "upload";
  content: string;
  /** Gợi ý cô đưa lúc làm bài — hiện lại ở màn chữa bài cho câu Nói. */
  hint?: string | null;
  /** Ảnh gợi ý của câu Nói. */
  images?: string[] | null;
  audio_url: string | null;
  explanation: string | null;
  options: Option[];
  /** Điểm tối đa của câu — mẫu số khi hiện điểm cô chấm. */
  score?: number | null;
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
  /** Bản ghi âm câu Nói em đã nộp — để nghe lại ở màn chữa bài. */
  answer_file_url?: string | null;
  is_correct: boolean | null;
  // Phần cô chấm tay (câu writing) — chỉ có ở payload GET result, không có ở
  // payload lúc vừa nộp bài.
  score?: number | null;
  feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
};

type Result = {
  id: number;
  /** in_progress | submitted | pending_review | graded */
  status?: string | null;
  total_score: number;
  correct_count: number;
  question_count: number;
  is_new_best?: boolean;
  previous_best_score?: number | null;
  started_at?: string | null;
  submitted_at?: string | null;
  // Cấu hình hiển thị điểm (theo snapshot lúc bắt đầu): số thập phân + điểm đạt.
  grading?: { decimals: number; pass_score: number };
  // Nguồn của lượt — quyết định màn này vẽ như khu lớp học hay khu tự luyện.
  source?: AttemptSource | null;
  mission?: AttemptMission | null;
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
type Verdict = "correct" | "wrong" | "pending" | "graded";

const VERDICT: Record<
  Verdict,
  { fg: string; bg: string; border: string; badge: string }
> = {
  correct: { fg: "#5E8418", bg: "#F1F8DE", border: "#C6E38A", badge: "Đúng ✓" },
  wrong: { fg: "#C1442F", bg: "#FDE7E2", border: "#F0B5A9", badge: "Sai ✕" },
  pending: { fg: "#B8860B", bg: "#FFF3D3", border: "#FFC94D", badge: "Chờ cô chấm" },
  // Câu cô chấm tay: badge/màu thật sự lấy theo điểm cô cho (xem `gradedStyle`),
  // các giá trị ở đây chỉ là mặc định khi chưa biết điểm tối đa.
  graded: { fg: "#B8860B", bg: "#FFF3D3", border: "#FFC94D", badge: "Cô đã chấm" },
};

/**
 * Câu chấm tay không có đúng/sai — dùng chính điểm cô cho để chọn màu:
 * tối đa → xanh, 0 → đỏ, còn lại → vàng (một phần).
 */
function gradedStyle(score: number, max: number) {
  const base = max > 0 && score >= max ? "correct" : score <= 0 ? "wrong" : "pending";
  return {
    ...VERDICT[base],
    badge: `Cô chấm · ${formatScore(score)}${max > 0 ? `/${formatScore(max)}` : ""}đ`,
  };
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

/** Câu tự luận/ghi âm chưa chấm tay → không tính vào điểm tự động. */
/** Câu cô chấm tay — không có đúng/sai tự động, chờ điểm + nhận xét của cô. */
function isManualType(type: Question["type"]): boolean {
  return type === "writing" || type === "speaking" || type === "upload";
}

function verdictOf(question: Question, answer: ResultAnswer | undefined): Verdict {
  if (answer?.is_correct === true) return "correct";
  if (answer?.is_correct === false) return "wrong";
  if (!isManualType(question.type)) return "wrong"; // câu tự chấm bỏ trống → sai
  return answer?.graded_at ? "graded" : "pending";
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

  // Câu viết lưu HTML (tiptap) → bóc thẻ, không thì hiện ra "<p>…</p>".
  const text = htmlToText(answer?.answer_text);

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

  if (question.type === "speaking") {
    return answer?.answer_file_url ? "Bài nói em đã nộp:" : "Em chưa ghi âm câu này";
  }

  // Trả lời ngắn / tự luận
  if (!text) return "Em chưa trả lời câu này";
  if (verdict === "pending" || verdict === "graded") return `Em trả lời: "${text}"`;
  if (verdict === "correct") return `Em trả lời: "${text}" — chính xác`;
  return correct
    ? `Em trả lời: "${text}" — đáp án gợi ý: "${correct}"`
    : `Em trả lời: "${text}"`;
}

/**
 * Bỏ đuôi thừa cho gọn: 9 → "9", 8.5 → "8.5", 3.333 → "3.33".
 * Có `decimals` (từ grading config) thì làm tròn theo đó; không thì mặc định 2 chữ số.
 */
function formatScore(value: number, decimals?: number): string {
  if (Number.isInteger(value)) return String(value);
  if (decimals !== undefined) return Number(value.toFixed(decimals)).toString();
  return String(Math.round(value * 100) / 100);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
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

// Payload lúc vừa nộp bài (lưu ở sessionStorage) dùng để vẽ ngay, khỏi chờ mạng —
// và để dự phòng: attempt điểm thấp có thể đã bị BE dedup xoá nên GET result không
// phải lúc nào cũng còn. Nhưng nó là ảnh chụp LÚC NỘP, chưa có phần cô chấm, nên
// luôn gọi GET đè lên khi gọi được.
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
 * `basePath` chỉ dùng để dựng link làm lại đề (root thư viện hay lớp học).
 */
export function StudentTestResult({
  basePath,
  attemptId,
  missionId = null,
}: {
  basePath: string;
  attemptId: string;
  /** Có khi xem kết quả từ lớp học — "Làm lại" phải mở tiếp lượt của nhiệm vụ đó. */
  missionId?: number | null;
}) {
  const router = useRouter();
  const routes = useMemo(() => testRoutes(basePath), [basePath]);

  const [result, setResult] = useState<Result | null>(() =>
    readStoredResult(attemptId),
  );
  const [error, setError] = useState<string | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Luôn gọi GET: bài writing được cô chấm SAU khi nộp nên bản lưu ở
    // sessionStorage không bao giờ có điểm/nhận xét của cô.
    api<Result>(`/attempts/${attemptId}/result`)
      .then(setResult)
      .catch((err) => {
        // Còn bản chụp lúc nộp thì cứ hiện, đừng ném lỗi ra màn hình.
        if (readStoredResult(attemptId)) return;
        // Lượt làm bài đã bị xoá/không tồn tại (vd link cũ trong thông báo) → chữ thân thiện.
        setError(
          err instanceof ApiError && err.status === 404
            ? "Lượt làm bài không còn nữa."
            : err instanceof ApiError ? err.message : "Không tải được kết quả.",
        );
      });
  }, [attemptId]);

  async function handleRetry(testId: number) {
    setRetrying(true);
    setError(null);
    try {
      // Ưu tiên mission của chính lượt vừa xem: mở lại đúng nguồn kể cả khi vào trang
      // bằng link không mang `?mission=`.
      const attempt = await startAttempt(testId, result?.mission?.id ?? missionId);
      router.push(routes.attempt(testId, attempt.attempt_id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không bắt đầu lại được bài.");
      setRetrying(false);
    }
  }

  if (error && !result) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-text">{error}</p>
        <Link href={routes.list} className="btn btn-secondary mt-4">Về danh sách đề</Link>
      </div>
    );
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
  const autoGradedCount = total - pendingCount;
  const manualCount = allQuestions.filter((q) => isManualType(q.type)).length;
  const teacherGradedCount = allQuestions.filter(
    (q) => verdicts.get(q.id) === "graded",
  ).length;
  const hasExplanation = allQuestions.some((q) => q.explanation);

  const maxScore = result.test.total_score || 10;
  const score = result.total_score ?? 0;
  // Điểm câu (`question.score`) ở thang riêng của câu, còn tổng ở thang của đề —
  // quy điểm câu về thang đề để "cô chấm x/yđ" và tổng không lệch đơn vị.
  const questionScoreSum = allQuestions.reduce((sum, q) => sum + (q.score ?? 0), 0);
  const scoreScale = questionScoreSum > 0 ? maxScore / questionScoreSum : 1;
  const scoreRatio = maxScore > 0 ? Math.min(1, Math.max(0, score / maxScore)) : 0;
  const scoreOn10 = scoreRatio * 10;
  const perQuestion = total > 0 ? maxScore / total : 0;

  // Cấu hình hiển thị điểm (đọc từ cấu hình theo snapshot lúc bắt đầu).
  const decimals = result.grading?.decimals ?? 1;
  const passScore = result.grading?.pass_score ?? 5;

  const tier: Verdict =
    scoreOn10 >= 8 ? "correct" : scoreOn10 >= passScore ? "pending" : "wrong";
  const praise =
    scoreOn10 >= 8 ? "Tuyệt vời!" : scoreOn10 >= passScore ? "Khá rồi!" : "Cần cố thêm!";

  // Còn câu chờ cô → nói rõ đang chờ. Đề toàn câu cô chấm (writing) → nói theo điểm
  // vì "câu đúng" không có nghĩa. Còn lại → praise theo số câu đúng.
  const summaryBadge =
    pendingCount > 0
      ? `Đã chấm tự động ${autoGradedCount}/${total} câu · ${pendingCount} câu chờ cô`
      : manualCount === total && teacherGradedCount > 0
        ? `Cô đã chấm xong · ${formatScore(score)}/${formatScore(maxScore)} điểm`
        : `${praise} ${correctCount}/${total} câu đúng`;

  const duration = formatDuration(result.started_at, result.submitted_at);

  const origin = { source: result.source, mission: result.mission };
  const assigned = isAssignment(origin);
  const canRetry = hasAttemptsLeft(origin);

  return (
    <div className="flex items-start gap-7 pb-2">
      {/* ── Rail trái: nguồn + điểm + hành động tiếp theo ── */}
      <aside className="flex w-[360px] shrink-0 flex-col gap-[18px]">
        {/* Nói rõ đây là bài cô giao hay bài tự luyện — hai luồng dùng chung màn này. */}
        <OriginBanner origin={origin} />

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
                {formatScore(score, decimals)}
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

        {/*
          Hành động tiếp theo KHÁC hẳn nhau theo nguồn:
            - bài cô giao → về lớp, và chỉ được làm lại khi còn lượt cô cho;
            - tự luyện    → về Thư viện, làm lại thoải mái.
          Trước đây cả hai đều hiện "Về Nhiệm vụ" + "Làm lại từ đầu" của khu tự luyện,
          nên bấm làm lại từ lớp là ăn 422 vì đã hết lượt.
        */}
        <div className="flex flex-col gap-2.5">
          <BackButton origin={origin} listHref={routes.list} />

          {canRetry ? (
            <button
              type="button"
              onClick={() => handleRetry(result.test.id)}
              disabled={retrying}
              className="flex h-[46px] items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-sm font-bold text-text transition-colors hover:border-brand hover:text-brand-bold disabled:opacity-60"
            >
              {retrying ? "Đang mở đề…" : assigned ? "Làm lại lượt nữa" : "Làm lại từ đầu"}
            </button>
          ) : (
            <Link
              href={`/library/tests/${result.test.id}`}
              className="flex h-[46px] items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-sm font-bold text-text transition-colors hover:border-brand hover:text-brand-bold"
            >
              Luyện lại đề này ở Thư viện
            </Link>
          )}

          <AttemptsNote origin={origin} />

          {/* /reports chưa có page — để "Sắp có" thay vì điều hướng ra 404. */}
          {!assigned && (
            <button
              type="button"
              disabled
              title="Sắp có"
              className="flex h-[46px] items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-sm font-bold text-text-muted"
            >
              Xem báo cáo của em
            </button>
          )}

          {error && (
            <p className="text-[13px] font-semibold text-[#C1442F]">{error}</p>
          )}
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
                        scoreScale={scoreScale}
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
  scoreScale,
}: {
  question: Question;
  index: number;
  answer: ResultAnswer | undefined;
  verdict: Verdict;
  /** Hệ số quy điểm câu về thang điểm của đề. */
  scoreScale: number;
}) {
  const style =
    verdict === "graded"
      ? gradedStyle((answer?.score ?? 0) * scoreScale, (question.score ?? 0) * scoreScale)
      : VERDICT[verdict];

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

      {question.type === "speaking" && question.hint && (
        <p className="mt-2 whitespace-pre-line text-[13px] font-medium leading-[1.55] text-text-secondary">
          {question.hint}
        </p>
      )}

      {question.type === "speaking" && !!question.images?.length && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {question.images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${url}-${i}`}
              src={url}
              alt={`Ảnh gợi ý ${i + 1}`}
              className="size-20 rounded-xl border-[1.5px] border-border object-cover"
            />
          ))}
        </div>
      )}

      <p
        className="mt-2.5 text-[13px] font-semibold leading-[1.5]"
        style={{ color: style.fg }}
      >
        {answerLine(question, answer, verdict)}
      </p>

      {question.type === "speaking" && answer?.answer_file_url && (
        <audio controls src={answer.answer_file_url} className="mt-2 w-full" />
      )}

      {verdict === "pending" && (
        <p className="mt-3 text-[13px] font-medium text-text-secondary">
          Cô sẽ chấm và gửi nhận xét cho em trong 24h.
        </p>
      )}

      {verdict === "graded" && (
        <div className="mt-3 rounded-[14px] bg-surface-alt p-3.5 text-[13px] font-medium leading-[1.65] text-text-secondary">
          {answer?.feedback?.trim() ? (
            <p>
              <b className="text-text">Nhận xét của cô:</b> {answer.feedback}
            </p>
          ) : (
            <p>Cô đã chấm bài nhưng chưa để lại nhận xét cho câu này.</p>
          )}
          <p className="mt-1.5 text-xs text-text-muted">
            {/* Tên trong DB đã là "Cô giáo"/"Cô Uyên" — đừng chèn thêm "Cô" nữa. */}
            {answer?.graded_by ? `${answer.graded_by} đã chấm` : "Đã chấm"}
            {answer?.graded_at ? ` · ${formatDateTime(answer.graded_at)}` : ""}
          </p>
        </div>
      )}

      {verdict === "wrong" && question.explanation && (
        <div className="mt-3 rounded-[14px] bg-surface-alt p-3.5 text-[13px] font-medium leading-[1.65] text-text-secondary">
          <b className="text-text">Lời giải:</b> {question.explanation}
        </div>
      )}
    </article>
  );
}
