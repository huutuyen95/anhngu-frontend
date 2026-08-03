export type Skill = "reading" | "listening" | "speaking" | "writing" | "mixed";

export const SKILL_LABEL: Record<Skill, string> = {
  reading: "Đọc",
  listening: "Nghe",
  speaking: "Nói",
  writing: "Viết",
  mixed: "Tổng hợp",
};

/**
 * 4 loại câu chính: trắc nghiệm · điền từ · chọn (True/False/Not Given) · viết luận.
 * `speaking` giữ lại (ẩn sau flag) cho giai đoạn sau.
 */
export type QuestionType = "multiple_choice" | "fill_blank" | "select" | "writing" | "speaking";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: "Trắc nghiệm",
  fill_blank: "Điền từ",
  select: "Chọn (True/False/Not Given)",
  writing: "Viết luận",
  speaking: "Nói",
};

/** Dòng danh sách đề — khớp `TestResource`. */
export type Test = {
  id: number;
  title: string;
  slug: string;
  category_id: number | null;
  category_name?: string | null;
  attempts_count?: number;
  skill: Skill;
  is_combo: boolean;
  thumbnail_url: string | null;
  duration_minutes: number;
  total_score: number;
  scoring_method: string;
  word_limit: number | null;
  rubric: string | null;
  is_published: boolean;
  shuffle_questions?: boolean;
  question_count?: number;
  created_at: string | null;
};

export type TestListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type TestListResponse = { data: Test[]; meta: TestListMeta };

export type TestFilters = {
  q?: string;
  skill?: string;
  is_published?: string; // "" | "true" | "false"
  category_id?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: string;
  per_page?: string;
};

// ── Thư mục đề (cây theo lớp) ──
export type TestCategory = {
  id: number;
  name: string;
  parent_id: number | null;
  order: number;
  tests_count: number;
  children: TestCategory[];
};

// ── Kiểm tra trước khi giao (A4prev) ──
export type PreflightCheck = { key: string; ok: boolean; label: string; hint: string };
export type TestPreflight = {
  checks: PreflightCheck[];
  all_ok: boolean;
  question_count: number;
  has_listening: boolean;
};

// ── Import Word (A4imp) — kết quả dry-run ──
export type WordImportQuestion = {
  n: number;
  text: string;
  type: QuestionType;
  status: "ok" | "warn" | "error";
  reasons: string[];
};
export type WordImportPreview = {
  parts: TestPart[];
  questions: WordImportQuestion[];
  summary: { ok: number; warn: number; error: number };
};

// ── Cây cấu trúc đề (editor) — khớp `TestDetailResource` / `SaveStructureRequest` ──

export type QuestionOption = {
  id?: number;
  label: string | null;
  content: string;
  is_correct: boolean;
};

export type Question = {
  id?: number;
  order: number;
  type: QuestionType;
  content: string | null;
  audio_url?: string | null;
  images: string[];
  record_limit_seconds: number | null;
  explanation?: string | null;
  options: QuestionOption[];
};

export type TestSection = {
  id?: number;
  order: number;
  instruction: string | null;
  passage: string | null;
  audio_url: string | null;
  max_plays: number | null;
  questions: Question[];
};

export type TestPart = {
  id?: number;
  order: number;
  title: string;
  sections: TestSection[];
};

/** Khớp `TestDetailResource` (GET show / PUT structure, `forTeacher: true`) — có kèm meta đề. */
export type TestDetail = {
  id: number;
  title: string;
  category_id?: number | null;
  attempts_count?: number;
  skill: Skill;
  duration_minutes: number;
  total_score: number;
  word_limit: number | null;
  is_published: boolean;
  shuffle_questions?: boolean;
  rubric: string | null;
  scoring_method: string;
  is_combo: boolean;
  thumbnail_url: string | null;
  parts: TestPart[];
};
