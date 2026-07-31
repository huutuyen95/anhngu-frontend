import { api } from "@/lib/api";
import type {
  AssignableItem,
  AssignResult,
  ClassOverview,
  ClassSession,
  SessionItemRow,
  SyncResult,
  SyncSessionDraft,
} from "@/lib/types/classroom";
import type { Student } from "@/lib/types/student";

export function getOverview(classId: number): Promise<ClassOverview> {
  return api(`/classrooms/${classId}/overview`);
}

export function listSessions(classId: number): Promise<{ data: ClassSession[] }> {
  return api(`/classrooms/${classId}/sessions`);
}

export function createSession(
  classId: number,
  payload: { title: string; note?: string; held_on?: string | null },
): Promise<{ session: { id: number } }> {
  return api(`/classrooms/${classId}/sessions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSession(
  id: number,
  payload: { title?: string; note?: string | null; held_on?: string | null },
): Promise<{ session: ClassSession }> {
  return api(`/sessions/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteSession(id: number): Promise<{ message: string }> {
  return api(`/sessions/${id}`, { method: "DELETE" });
}

export function reorderSessions(ids: number[]): Promise<{ message: string }> {
  return api(`/sessions/reorder`, { method: "PATCH", body: JSON.stringify({ ids }) });
}

/** Đồng bộ toàn bộ tiến trình (tạo/sửa/xoá/đổi thứ tự) trong 1 request. */
export function syncSessions(
  classId: number,
  payload: {
    sessions: SyncSessionDraft[];
    deleted_ids: number[];
    force_delete_ids?: number[];
  },
): Promise<SyncResult> {
  return api(`/classrooms/${classId}/sessions/sync`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listSessionItems(sessionId: number): Promise<{ data: SessionItemRow[] }> {
  return api(`/session-items?session_id=${sessionId}`);
}

export function deleteSessionItem(id: number): Promise<{ message: string }> {
  return api(`/session-items/${id}`, { method: "DELETE" });
}

export function listAssignableContent(
  type: string,
  q = "",
): Promise<{ data: AssignableItem[] }> {
  const qs = new URLSearchParams({ type });
  if (q) qs.set("q", q);
  return api(`/assignable-content?${qs.toString()}`);
}

export type AssignPayload = {
  classroom_id: number;
  class_session_id: number;
  items: { type: string; id: number }[];
  student_ids?: number[];
  due_date?: string | null;
  attempts_allowed?: number;
  schedule: "now" | "at" | "draft";
  scheduled_at?: string | null;
  notify?: boolean;
};

export function createAssignment(payload: AssignPayload): Promise<AssignResult> {
  return api(`/assignments`, { method: "POST", body: JSON.stringify(payload) });
}

export function remindClass(classId: number): Promise<{ reminded: number }> {
  return api(`/classrooms/${classId}/remind`, { method: "POST" });
}

// ── Học viên trong lớp ──

export function listClassStudents(classId: number): Promise<{ data: Student[] }> {
  return api(`/classrooms/${classId}/students`);
}

export function addClassStudents(
  classId: number,
  userIds: number[],
): Promise<{ added: number }> {
  return api(`/classrooms/${classId}/students`, {
    method: "POST",
    body: JSON.stringify({ user_ids: userIds }),
  });
}

export function quickCreateClassStudent(
  classId: number,
  payload: { name: string; email: string },
): Promise<{ student: Student; temp_password: string }> {
  return api(`/classrooms/${classId}/students/quick`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeClassStudent(
  classId: number,
  userId: number,
): Promise<{ message: string }> {
  return api(`/classrooms/${classId}/students/${userId}`, { method: "DELETE" });
}
