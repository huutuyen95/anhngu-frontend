"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { testRoutes, type TestRoutes } from "@/features/tests/routes";
import type { Skill } from "@/lib/types/test";

export type Option = { id: number; label: string; content: string };

export type Question = {
  id: number;
  order: number;
  type: "multiple_choice" | "fill_blank" | "select" | "writing" | "upload";
  content: string;
  audio_url: string | null;
  options: Option[];
};

export type Section = {
  id: number;
  instruction: string | null;
  passage: string | null;
  audio_url: string | null;
  order: number;
  questions: Question[];
};

export type Part = {
  id: number;
  title: string;
  order: number;
  sections: Section[];
};

export type TestDetail = {
  id: number;
  title: string;
  skill: Skill;
  duration_minutes: number;
  total_score: number;
  parts: Part[];
};

export type Answer = { question_id: number; question_option_id?: number; answer_text?: string };

/** Trạng thái lượt làm lấy từ GET /attempts/{id} — nguồn tính giờ + khôi phục bài. */
type AttemptState = {
  id: number;
  status: "in_progress" | "submitted" | "pending_review" | "graded" | "expired";
  started_at: string | null;
  deadline: string | null;
  tab_exit_count: number;
  tab_exit_limit: number;
  answers: Answer[];
};

/** Phản hồi khi báo một lần thoát tab. */
type TabExitResponse = {
  tab_exit_count: number;
  tab_exit_limit: number;
  auto_submitted: boolean;
  result?: unknown;
};

/** Số lần rời tab tối đa nếu server chưa kịp trả về (server vẫn là nguồn chuẩn). */
const DEFAULT_EXIT_LIMIT = 3;

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function hasAnswer(answer: Answer | undefined): boolean {
  if (!answer) return false;
  if (answer.question_option_id !== undefined) return true;
  return !!answer.answer_text && answer.answer_text.trim() !== "";
}

/**
 * Nhãn phần. `part.title` đã là "Phần 1"/"Reading"… nên KHÔNG ghép thêm số vào:
 * `part.order` chạy từ 0 nên ghép sẽ ra "Phần 0 · Phần 1". Chỉ khi đề không đặt
 * tiêu đề mới tự sinh số từ `order` (0-based → +1).
 */
export function partLabel(part: Pick<Part, "order" | "title">): string {
  const title = part.title?.trim();
  return title || `Phần ${part.order + 1}`;
}

export type TestAttemptState = {
  test: TestDetail | null;
  error: string | null;
  attemptGone: boolean;
  answers: Record<number, Answer>;
  marked: Set<number>;
  savedAt: string | null;
  confirmSubmit: boolean;
  setConfirmSubmit: (open: boolean) => void;
  submitting: boolean;
  now: number;
  deadline: number | null;
  exitCount: number;
  exitLimit: number;
  exitWarn: { count: number; limit: number } | null;
  setExitWarn: (warn: { count: number; limit: number } | null) => void;
  autoSubmitted: boolean;
  routes: TestRoutes;
  setOptionAnswer: (questionId: number, optionId: number) => void;
  setTextAnswer: (questionId: number, text: string) => void;
  toggleMark: (questionId: number) => void;
  handleSubmit: () => void;
  goToResult: () => void;
  /** Ép lưu nháp ngay (bỏ qua debounce 1.2s) — dùng cho nút "Lưu nháp" thủ công. */
  saveNow: () => void;
};

/**
 * Toàn bộ vòng đời lượt làm bài: tải đề + trạng thái lượt, autosave, đồng hồ đếm
 * ngược, chống thoát tab, nộp bài. Dùng chung cho MỌI layout hiển thị (đề hỗn hợp
 * và đề Reading dạng sách 2 cột) — 2 màn chỉ khác cách render, không khác logic.
 */
export function useTestAttempt({
  basePath,
  testId: id,
  attemptId,
}: {
  basePath: string;
  testId: string;
  attemptId: string;
}): TestAttemptState {
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
  const [exitWarn, setExitWarn] = useState<{ count: number; limit: number } | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false); // popup "đã bị nộp vì rời quá số lần"

  const submittedRef = useRef(false);
  const submitTriggeredRef = useRef(false); // đã kích hoạt nộp (chặn gọi nộp 2 lần)
  const deadlineFiredRef = useRef(false); // hết giờ đã kích hoạt nộp (chỉ 1 lần duy nhất)
  const answersRef = useRef(answers);
  const exitCountRef = useRef(0);
  const exitLimitRef = useRef(DEFAULT_EXIT_LIMIT);
  const awayRef = useRef(false); // đang ở ngoài tab (đã tính 1 lần thoát, chờ quay lại)

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
      // Chưa làm câu nào thì khỏi gọi lưu — không có gì để lưu, cứ nộp thẳng.
      const payload = buildAnswersPayload();
      if (payload.length > 0) {
        await api(`/attempts/${attemptId}/answers`, {
          method: "PUT",
          body: JSON.stringify({ answers: payload }),
        });
      }
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
      const payload = buildAnswersPayload();
      if (payload.length > 0) {
        await api(`/attempts/${attemptId}/answers`, {
          method: "PUT",
          body: JSON.stringify({ answers: payload }),
        });
      }
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

  // Đồng hồ đếm ngược, tự nộp khi hết giờ.
  // Hết giờ chỉ được kích hoạt nộp ĐÚNG MỘT LẦN: trước đây tick nào quá hạn cũng gọi
  // handleSubmit, nên chỉ cần lần nộp đó lỗi là mỗi giây thử lại một lần → nút "Nộp bài"
  // nhấp nháy giữa "Nộp bài" ↔ "Đang nộp..." và không bao giờ nộp xong.
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !deadlineFiredRef.current) {
        deadlineFiredRef.current = true;
        clearInterval(interval);
        void handleSubmit();
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

      if (document.visibilityState === "hidden") {
        if (awayRef.current) return; // đã tính cho lần rời này rồi
        awayRef.current = true;
        exitCountRef.current += 1;
        const count = exitCountRef.current;
        setExitCount(count);
        if (count > limit) {
          void autoSubmitOnExit(); // vượt hạn → nộp ngay, không gọi tab-exit
        } else {
          void reportExitCount();
        }
      } else if (document.visibilityState === "visible") {
        if (!awayRef.current) return;
        awayRef.current = false;
        if (exitCountRef.current > limit) {
          void autoSubmitOnExit();
        } else {
          setExitWarn({ count: exitCountRef.current, limit });
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

  return {
    test,
    error,
    attemptGone,
    answers,
    marked,
    savedAt,
    confirmSubmit,
    setConfirmSubmit,
    submitting,
    now,
    deadline,
    exitCount,
    exitLimit,
    exitWarn,
    setExitWarn,
    autoSubmitted,
    routes,
    setOptionAnswer,
    setTextAnswer,
    toggleMark,
    handleSubmit,
    goToResult,
    saveNow: () => void saveAnswers(),
  };
}
