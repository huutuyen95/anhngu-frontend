export type Skill = "reading" | "listening" | "speaking" | "writing" | "mixed";

export const SKILL_LABEL: Record<Skill, string> = {
  reading: "Đọc",
  listening: "Nghe",
  speaking: "Nói",
  writing: "Viết",
  mixed: "Tổng hợp",
};

/** UI hiện tạo được 3 dạng câu — máy chấm (trắc nghiệm), viết và nói (giáo viên chấm tay). */
export type QuestionType = "multiple_choice" | "writing" | "speaking";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: "Trắc nghiệm",
  writing: "Viết luận",
  speaking: "Nói",
};

/** Dòng danh sách đề — khớp `TestResource`. */
export type Test = {
  id: number;
  title: string;
  slug: string;
  skill: Skill;
  is_combo: boolean;
  thumbnail_url: string | null;
  duration_minutes: number;
  total_score: number;
  scoring_method: string;
  word_limit: number | null;
  rubric: string | null;
  is_published: boolean;
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
  sort?: string;
  dir?: "asc" | "desc";
  page?: string;
  per_page?: string;
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
  skill: Skill;
  duration_minutes: number;
  total_score: number;
  word_limit: number | null;
  is_published: boolean;
  rubric: string | null;
  scoring_method: string;
  is_combo: boolean;
  thumbnail_url: string | null;
  parts: TestPart[];
};
