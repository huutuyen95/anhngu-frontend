export type ReportPeriod = "7d" | "30d" | "90d";
export type ReportScope = "overview" | "class";
export type ActivityType = "exercise" | "test" | "vocab" | "speaking";

export type ReportNote = { dir: "up" | "down" | "flat"; text: string };

export type StudentReport = {
  scope: ReportScope;
  period: ReportPeriod;
  stats: {
    avg_score: number;
    completed: number;
    attempts: number;
    study_seconds: number;
    weekly: { score: number[]; completed: number[]; attempts: number[]; minutes: number[] };
    notes: { avg_score: ReportNote; completed: ReportNote; attempts: ReportNote; study: ReportNote };
  };
  skills: { listening: number[]; reading: number[]; writing: number[]; speaking: number[] };
  class_progress: { classroom_id: number; name: string; done: number; total: number; pct: number }[];
  activity_mix: { type: ActivityType; count: number }[];
  test_history: { attempt_id: number; test_id: number; test_name: string; score: number | null; pending: boolean; taken_at: string | null }[];
  activity_7d: { id: number; name: string; category: ActivityType; status: string; at: string | null; target_type: string | null; target_id: number | null }[];
};

export const PERIOD_LABEL: Record<ReportPeriod, string> = {
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
  "90d": "90 ngày qua",
};
