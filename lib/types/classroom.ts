export type ClassStatus = "active" | "upcoming" | "ended";

export type Classroom = {
  id: number;
  name: string;
  slug: string;
  cover_url: string | null;
  status: ClassStatus;
  starts_on: string | null;
  ends_on: string | null;
  description: string | null;
  students_count: number;
  sessions_count: number;
  open_missions_count: number;
  pending_review_count: number;
  progress_pct: number;
  avg_score: number;
  last_session: { title: string; held_on: string | null } | null;
  created_at?: string | null;
};

export type ClassroomListResponse = {
  data: Classroom[];
  meta: { current_page: number; last_page: number; total: number };
};

export type CoverPreset = { id: string; cover_url: string };

export type DashboardData = {
  stats: {
    classes: number;
    pending_review: number;
    open_missions: number;
    avg_score_week: number;
    delta: number | null;
  };
  classes: Classroom[];
  todos: { type: string; text: string; href: string }[];
  activities: { type: string; text: string; time: string | null }[];
};

export const CLASS_STATUS_LABEL: Record<ClassStatus, string> = {
  active: "Đang diễn ra",
  upcoming: "Chưa bắt đầu",
  ended: "Đã kết thúc",
};

// ── Chi tiết lớp (C2/C3) ──

export type ClassSession = {
  id: number;
  order: number;
  title: string;
  note: string | null;
  held_on: string | null;
  is_visible: boolean;
  items_count: number;
  done: number;
  total: number;
  progress_pct: number;
  student_count: number;
};

export type SyncSessionDraft = {
  id: number | null;
  title: string;
  is_visible: boolean;
};

export type SyncBlocked = {
  id: number;
  title: string;
  items_count: number;
  missions_count: number;
};

export type SyncResult = {
  ok: true;
  sessions: ClassSession[];
  created: number;
  updated: number;
  deleted: number;
};

export type AtRiskStudent = {
  user: { id: number; name: string };
  reason: string;
  tag: "at_risk" | "low_score" | "inactive";
};

export type ClassOverview = {
  stats: {
    progress_pct: number;
    active_students: number;
    total_students: number;
    avg_score: number;
    pending_review: number;
    deltas: Record<string, number> | null;
  };
  sessions: ClassSession[];
  at_risk: AtRiskStudent[];
};

export type AssignableItem = { type: string; id: number; title: string; meta: string };

export type SessionItemRow = {
  id: number;
  type: string;
  itemable_id: number;
  title: string;
  meta: string;
  assigned: number;
  done: number;
};

export type AssignResult = {
  created: number;
  students_targeted: number;
  excluded_locked: number;
  duplicates: number;
  notified: number;
};

export type AttendanceRow = {
  user_id: number;
  name: string;
  email: string;
  status: "on_time" | "late" | "absent" | null;
  comment: string;
};

export type ClassReport = {
  stats: {
    active_students: number;
    completed: number;
    attempts: number;
    study_seconds: number;
    delta: Record<string, number> | null;
  };
  weekly_avg: { week: string; score: number }[];
  score_buckets: { range: string; count: number }[];
  by_session: { session: string; assigned: number; done: number; completion_pct: number }[];
  by_student: {
    user: { id: number; name: string };
    completion_pct: number;
    attempts: number;
    study_seconds: number;
    low_score_count: number;
    attended: number;
    last_week_score: number;
  }[];
  pending_count: number;
};
