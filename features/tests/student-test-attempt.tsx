"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
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

/** Trạng thái lượt làm lấy từ GET /attempts/{id} — nguồn tính giờ + khôi phục bài. */
type ExitAction = "log" | "warn" | "autosubmit";

type AttemptState = {
  id: number;
  status: "in_progress" | "submitted" | "pending_review" | "graded" | "expired";
  started_at: string | null;
  deadline: string | null;
  tab_exit_count: number;
  tab_exit_limit: number;
  tab_exit_action: ExitAction;
  block_copy?: boolean;
  autosubmit_on_timeout?: boolean;
  answers: Answer[];
};

/** Phản hồi khi báo một lần thoát tab. */
type TabExitResponse = {
  tab_exit_count: number;
  tab_exit_limit: number;
  tab_exit_action: ExitAction;
  auto_submitted: boolean;
  result?: unknown;
};

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

/** Số lần rời tab tối đa nếu server chưa kịp trả về (server vẫn là nguồn chuẩn). */
const DEFAULT_EXIT_LIMIT = 3;

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

  const [test, setTest] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Lượt làm bài không còn hợp lệ (bị xoá do mở lượt mới / đã kết thúc) → chặn thao tác, báo rõ.
  const [attemptGone, setAttemptGone] = useState(false);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Hạn nộp lấy từ server (không còn qua URL). null = chưa tải / không giới hạn.
  const [deadline, setDeadline] = useState<number | null>(null);

  // Chống gian lận: đếm số lần rời tab. Cảnh báo khi quay lại; vượt hạn → tự nộp ngay.
  const [exitCount, setExitCount] = useState(0);
  const [exitLimit, setExitLimit] = useState<number>(DEFAULT_EXIT_LIMIT);
  const [exitAction, setExitAction] = useState<ExitAction>("warn");
  const [exitWarn, setExitWarn] = useState<{ count: number; limit: number } | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false); // popup "đã bị nộp vì rời quá số lần"

  const submittedRef = useRef(false);
  const submitTriggeredRef = useRef(false); // đã kích hoạt nộp (chặn gọi nộp 2 lần)
  const answersRef = useRef(answers);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const exitCountRef = useRef(0);
  const exitLimitRef = useRef(DEFAULT_EXIT_LIMIT);
  const exitActionRef = useRef<ExitAction>("warn"); // xử lý khi vượt hạn (theo cấu hình)
  const awayRef = useRef(false); // đang ở ngoài tab (đã tính 1 lần thoát, chờ quay lại)
  const autosubmitTimeoutRef = useRef(true); // tự nộp khi hết giờ (theo cấu hình)

  const [blockCopy, setBlockCopy] = useState(true); // chặn sao chép khi làm bài

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Tải cấu trúc đề + trạng thái lượt làm (hạn nộp, đáp án đã lưu, số lần thoát).
  useEffect(() => {
    let cancelled = false;

    api<TestDetail>(`/tests/${id}`)
      .then((data) => {
        if (!cancelled) setTest(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Không tải được đề thi.");
      });

    api<AttemptState>(`/attempts/${attemptId}`)
      .then((state) => {
        if (cancelled) return;
        // Lượt đã kết thúc trước đó → sang thẳng trang kết quả.
        if (state.status !== "in_progress") {
          submittedRef.current = true;
          router.replace(routes.result(id, attemptId));
          return;
        }
        setDeadline(state.deadline ? new Date(state.deadline).getTime() : null);
        setExitLimit(state.tab_exit_limit);
        exitLimitRef.current = state.tab_exit_limit;
        exitActionRef.current = state.tab_exit_action ?? "warn";
        setExitAction(state.tab_exit_action ?? "warn");
        autosubmitTimeoutRef.current = state.autosubmit_on_timeout ?? true;
        setBlockCopy(state.block_copy ?? true);
        exitCountRef.current = state.tab_exit_count;
        setExitCount(state.tab_exit_count);
        // Khôi phục đáp án đã lưu (làm tiếp sau khi reload / vào lại).
        if (state.answers.length > 0) {
          const restored: Record<number, Answer> = {};
          for (const a of state.answers) {
            restored[a.question_id] = {
              question_id: a.question_id,
              ...(a.question_option_id != null
                ? { question_option_id: a.question_option_id }
                : {}),
              ...(a.answer_text != null ? { answer_text: a.answer_text } : {}),
            };
          }
          setAnswers(restored);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 = lượt làm bài không còn (đã bị thay bằng lượt mới, hoặc đã kết thúc).
        if (err instanceof ApiError && err.status === 404) {
          submittedRef.current = true; // chặn beforeunload + mọi lần tự nộp
          setAttemptGone(true);
          return;
        }
        // Lỗi khác (mạng…) → vẫn cho làm bài, coi như không giới hạn giờ.
      });

    return () => {
      cancelled = true;
    };
  }, [id, attemptId, router, routes]);

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

  const storeResult = useCallback(
    (result: unknown) => {
      try {
        sessionStorage.setItem(`test-result-${attemptId}`, JSON.stringify(result));
      } catch {
        // sessionStorage có thể đầy/bị chặn — trang kết quả sẽ fallback GET /result.
      }
    },
    [attemptId],
  );

  const goToResult = useCallback(() => {
    router.push(routes.result(id, attemptId));
  }, [id, attemptId, router, routes]);

  /** Nộp bài thủ công / hết giờ → nộp xong chuyển thẳng sang trang kết quả. */
  const handleSubmit = useCallback(async () => {
    if (submittedRef.current || submitTriggeredRef.current) return;
    submitTriggeredRef.current = true;
    setSubmitting(true);
    try {
      await api(`/attempts/${attemptId}/answers`, {
        method: "PUT",
        body: JSON.stringify({ answers: buildAnswersPayload() }),
      });
      const result = await api(`/attempts/${attemptId}/submit`, { method: "POST" });
      submittedRef.current = true;
      storeResult(result);
      goToResult();
    } catch (err) {
      // Lượt đã bị xoá (mở lượt mới ở tab khác…) → báo rõ thay vì lỗi kỹ thuật.
      if (err instanceof ApiError && err.status === 404) {
        submittedRef.current = true;
        setAttemptGone(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Không nộp được bài.");
      submitTriggeredRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, storeResult, goToResult]);

  /**
   * Rời tab quá số lần cho phép → NỘP NGAY phía client (không chờ response tab-exit),
   * rồi bật popup "đã bị nộp". Việc nộp ngay lập tức là điểm mấu chốt: không phụ thuộc
   * vào thứ tự trả về của request nền khi tab đang ẩn.
   */
  const autoSubmitOnExit = useCallback(async () => {
    if (submittedRef.current || submitTriggeredRef.current) return;
    submitTriggeredRef.current = true;
    setSubmitting(true);
    try {
      await api(`/attempts/${attemptId}/answers`, {
        method: "PUT",
        body: JSON.stringify({ answers: buildAnswersPayload() }),
      });
      const result = await api(`/attempts/${attemptId}/submit`, { method: "POST" });
      storeResult(result);
    } catch (err) {
      // Lượt không còn tồn tại → báo rõ, không hiện popup "đã nộp" gây hiểu nhầm.
      if (err instanceof ApiError && err.status === 404) {
        submittedRef.current = true;
        setSubmitting(false);
        setExitWarn(null);
        setAttemptGone(true);
        return;
      }
      // Lỗi khác → vẫn coi là đã nộp, trang kết quả sẽ fallback GET /result.
    }
    submittedRef.current = true;
    setSubmitting(false);
    setExitWarn(null);
    setAutoSubmitted(true);
  }, [attemptId, storeResult]);

  // Đồng hồ đếm ngược, tự nộp khi hết giờ (nếu cấu hình bật autosubmit_on_timeout)
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && autosubmitTimeoutRef.current) {
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, handleSubmit]);

  // Chống gian lận: đếm số lần rời tab.
  //  - Lần CHƯA vượt hạn: báo server (đếm bền vững qua reload) + cảnh báo khi quay lại.
  //  - Lần VƯỢT hạn: tự nộp NGAY phía client, không chờ server, rồi bật popup "đã bị nộp".
  useEffect(() => {
    // Đồng bộ bộ đếm với server cho các lần chưa vượt hạn.
    async function reportExitCount() {
      try {
        const res = await api<TabExitResponse>(`/attempts/${attemptId}/tab-exit`, {
          method: "POST",
        });
        exitCountRef.current = Math.max(exitCountRef.current, res.tab_exit_count);
        setExitCount(exitCountRef.current);
        exitLimitRef.current = res.tab_exit_limit;
        setExitLimit(res.tab_exit_limit);
        // Phòng khi client lệch: nếu server bảo đã tự nộp thì cũng nộp/hiện popup.
        if (res.auto_submitted && !submittedRef.current && !submitTriggeredRef.current) {
          void autoSubmitOnExit();
        }
      } catch {
        // Bỏ qua lỗi mạng — vẫn đếm optimistic ở client.
      }
    }

    function onVisibility() {
      const limit = exitLimitRef.current;

      // Đã nộp/đang nộp: khi quay lại chỉ hiện popup đã nộp, không đếm nữa.
      if (submittedRef.current || submitTriggeredRef.current) {
        if (document.visibilityState === "visible") {
          awayRef.current = false;
          setAutoSubmitted(true);
        }
        return;
      }

      const action = exitActionRef.current;

      if (document.visibilityState === "hidden") {
        if (awayRef.current) return; // đã tính cho lần rời này rồi
        awayRef.current = true;
        exitCountRef.current += 1;
        const count = exitCountRef.current;
        setExitCount(count);
        // Chỉ tự nộp NGAY khi cấu hình là 'autosubmit' và đã vượt hạn.
        if (action === "autosubmit" && count > limit) {
          void autoSubmitOnExit();
        } else {
          void reportExitCount(); // 'warn'/'log' và các lần chưa vượt: chỉ đếm ở server
        }
      } else if (document.visibilityState === "visible") {
        if (!awayRef.current) return;
        awayRef.current = false;
        if (action === "log") return; // ghi nhận ngầm — không làm phiền học sinh
        if (action === "autosubmit" && exitCountRef.current > limit) {
          void autoSubmitOnExit();
        } else {
          setExitWarn({ count: exitCountRef.current, limit }); // 'warn' (và autosubmit chưa vượt)
        }
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [attemptId, autoSubmitOnExit]);

  // Chặn đóng/tải lại tab giữa chừng — hiện hộp thoại xác nhận mặc định của trình duyệt.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Chặn sao chép / dán / chuột phải khi làm bài (theo cấu hình exam.block_copy).
  useEffect(() => {
    if (!blockCopy) return;
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("contextmenu", prevent);
    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("contextmenu", prevent);
    };
  }, [blockCopy]);

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

  if (attemptGone) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-[20px] border-[1.5px] border-border bg-surface px-8 py-12 text-center">
        <h1 className="font-display text-[22px] font-bold text-text">Lượt làm bài không còn nữa</h1>
        <p className="text-[14.5px] leading-relaxed text-text-secondary">
          Lượt làm bài này đã kết thúc hoặc được thay bằng một lượt mới (có thể em đã mở lại đề ở
          nơi khác). Em quay lại danh sách đề và bắt đầu lại nhé.
        </p>
        <Link
          href={routes.list}
          className="mt-1 inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
        >
          Về danh sách đề
        </Link>
      </div>
    );
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

        {/* Cảnh báo chống thoát tab (ẩn khi chỉ ghi nhận ngầm) */}
        {exitAction !== "log" && (
          <div
            className="rounded-[20px] border-[1.5px] px-[22px] py-3.5"
            style={
              exitCount >= exitLimit
                ? { borderColor: "#E5604C", background: "#FDE7E2" }
                : exitCount > 0
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
                style={{ color: exitCount >= exitLimit ? "#C1442F" : "#3A3330" }}
              >
                {exitCount}/{exitLimit}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] font-semibold text-text-secondary">
              {exitAction === "autosubmit"
                ? `Rời quá ${exitLimit} lần, bài sẽ tự động nộp.`
                : `Em nên hạn chế rời màn thi (tối đa ${exitLimit} lần).`}
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

      {/* Cảnh báo khi học sinh quay lại sau khi rời tab (không hiện nếu đã tự nộp). */}
      <Modal
        open={exitWarn !== null && !autoSubmitted}
        onClose={() => setExitWarn(null)}
        title="Em vừa rời khỏi màn thi"
        footer={
          <button
            type="button"
            onClick={() => setExitWarn(null)}
            className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
          >
            Tiếp tục làm bài
          </button>
        }
      >
        {exitWarn && (
          <div className="text-[14.5px] leading-relaxed text-text-secondary">
            <p>
              Em đã rời khỏi màn làm bài{" "}
              <b className="text-[#C1442F]">
                {exitWarn.count}/{exitWarn.limit}
              </b>{" "}
              lần.
            </p>
            <p className="mt-2">
              {exitAction === "autosubmit"
                ? exitWarn.count >= exitWarn.limit
                  ? "Đây là lần cuối được phép — rời thêm một lần nữa, bài sẽ TỰ ĐỘNG NỘP ngay."
                  : `Rời khỏi màn thi quá ${exitWarn.limit} lần thì bài sẽ tự động nộp. Em tập trung làm bài nhé!`
                : `Em đã rời màn thi ${exitWarn.count} lần. Hạn chế rời đi để tập trung làm bài nhé!`}
            </p>
          </div>
        )}
      </Modal>

      {/* Popup báo đã tự động nộp vì rời quá số lần cho phép. */}
      <Modal
        open={autoSubmitted}
        onClose={goToResult}
        title="Bài đã được nộp"
        footer={
          <button
            type="button"
            onClick={goToResult}
            className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
          >
            Xem kết quả
          </button>
        }
      >
        <div className="text-[14.5px] leading-relaxed text-text-secondary">
          <p>
            Em đã rời khỏi màn thi quá{" "}
            <b className="text-[#C1442F]">{exitLimit}</b> lần cho phép, nên hệ thống đã{" "}
            <b className="text-[#C1442F]">tự động nộp bài</b>.
          </p>
          <p className="mt-2">Em xem lại kết quả nhé.</p>
        </div>
      </Modal>
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
