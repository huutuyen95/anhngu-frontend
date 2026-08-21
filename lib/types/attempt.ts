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

/** Nguồn của lượt làm: bài cô giao trong lớp, hay em tự luyện ở Thư viện. */
export type AttemptSource = "assignment" | "library";

export const ATTEMPT_SOURCE_LABEL: Record<AttemptSource, string> = {
  assignment: "Bài giao",
  library: "Tự luyện",
};

/** Dòng danh sách "Kết quả làm bài" — khớp `AttemptResource`. */
export type Attempt = {
  id: number;
  status: AttemptStatus;
  source: AttemptSource;
  /** Lớp của bài giao; `null` với lượt tự luyện. */
  classroom: { id: number; name: string } | null;
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
  source?: string;
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

/** Gợi ý chấm của AI — chỉ khu cô chấm mới nhận được, học viên không bao giờ thấy. */
export type AiSuggestion = {
  score: number | null;
  feedback: string | null;
  status: "ok" | "failed";
  error: string | null;
  model: string | null;
  created_at: string | null;
};

export type AttemptQuestion = {
  id: number;
  order: number;
  type: string;
  content: string | null;
  /** Gợi ý cô đưa cho học viên lúc làm bài (câu Nói) — cô cần thấy lại lúc chấm. */
  hint?: string | null;
  score: number;
  explanation: string | null;
  /** Ảnh gợi ý của câu speaking. */
  images?: string[];
  options: { id: number; label: string | null; content: string; is_correct: boolean }[];
  /**
   * Khối chữ dựng sẵn (đề + tiêu chí + bài làm) để cô copy sang ChatGPT tự chấm.
   * Chỉ có ở câu viết, và `null` khi em bỏ trống bài.
   */
  ai_prompt: string | null;
  ai_suggestion: AiSuggestion | null;
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
  source: AttemptSource;
  classroom: { id: number; name: string } | null;
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
