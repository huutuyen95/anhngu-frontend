import type { Skill } from "@/lib/types/test";

export type AttemptStatus =
  | "in_progress"
  | "paused"
  | "submitted"
  | "pending_review"
  | "graded"
  | "expired";

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  in_progress: "Đang làm",
  paused: "Tạm dừng",
  submitted: "Đã nộp",
  pending_review: "Chờ chấm",
  graded: "Đã chấm",
  expired: "Hết giờ",
};

export const ATTEMPT_STATUS_TONE: Record<
  AttemptStatus,
  "success" | "danger" | "warning" | "info" | "neutral"
> = {
  in_progress: "warning",
  paused: "neutral",
  submitted: "info",
  pending_review: "warning",
  graded: "success",
  expired: "danger",
};

/** Dòng danh sách "Kết quả làm bài" — khớp `AttemptResource`. */
export type Attempt = {
  id: number;
  status: AttemptStatus;
  test: { id: number; title: string; skill: Skill };
  student: { id: number; name: string; email: string };
  total_score: number | null;
  correct_count: number | null;
  question_count: number | null;
  started_at: string | null;
  submitted_at: string | null;
};

export type AttemptListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AttemptListResponse = { data: Attempt[]; meta: AttemptListMeta };

export type AttemptFilters = {
  status?: string;
  classroom_id?: string;
  test_id?: string;
  user_id?: string;
  page?: string;
  per_page?: string;
};

// ── Chi tiết bài làm (chấm) — khớp `AttemptDetailResource` ──

export type AttemptAnswer = {
  question_option_id: number | null;
  answer_text: string | null;
  answer_file_url: string | null;
  is_correct: boolean | null;
  score: number;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
};

export type AttemptQuestion = {
  id: number;
  order: number;
  type: string;
  content: string | null;
  score: number;
  explanation: string | null;
  /**
   * Ảnh gợi ý của câu speaking — `AttemptDetailResource` hiện CHƯA trả field này (chỉ
   * `TestDetailResource` ở editor có), nên luôn `undefined` cho tới khi BE bổ sung.
   */
  images?: string[];
  options: { id: number; label: string | null; content: string; is_correct: boolean }[];
  answer: AttemptAnswer | null;
};

export type AttemptSection = {
  id: number;
  order: number;
  instruction: string | null;
  passage: string | null;
  questions: AttemptQuestion[];
};

export type AttemptPart = {
  id: number;
  order: number;
  title: string;
  sections: AttemptSection[];
};

export type AttemptDetail = {
  id: number;
  status: AttemptStatus;
  total_score: number | null;
  correct_count: number | null;
  question_count: number | null;
  started_at: string | null;
  submitted_at: string | null;
  student: { id: number; name: string; email: string };
  test: {
    id: number;
    title: string;
    skill: Skill;
    total_score: number;
    word_limit: number | null;
    rubric: string | null;
    parts: AttemptPart[];
  };
};
