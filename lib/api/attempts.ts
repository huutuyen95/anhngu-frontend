import { api } from "@/lib/api";
import type { AttemptDetail, AttemptFilters, AttemptListResponse } from "@/lib/types/attempt";

export function listAttempts(filters: AttemptFilters): Promise<AttemptListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return api<AttemptListResponse>(`/admin/attempts${query ? `?${query}` : ""}`);
}

export function getAttempt(id: number): Promise<{ attempt: AttemptDetail }> {
  return api(`/admin/attempts/${id}`);
}

export type GradeAnswerPayload = { question_id: number; score: number; feedback?: string | null };

export function gradeAttempt(
  id: number,
  answers: GradeAnswerPayload[],
): Promise<{ attempt: AttemptDetail }> {
  return api(`/admin/attempts/${id}/grade`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}
