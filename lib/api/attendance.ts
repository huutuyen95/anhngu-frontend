import { api } from "@/lib/api";
import type { AttendanceRow } from "@/lib/types/classroom";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function getAttendances(sessionId: number): Promise<{ data: AttendanceRow[] }> {
  return api(`/sessions/${sessionId}/attendances`);
}

export function saveAttendances(
  sessionId: number,
  items: { user_id: number; status: string; comment?: string }[],
): Promise<{ saved: number }> {
  return api(`/sessions/${sessionId}/attendances/bulk`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export function attendanceExportUrl(sessionId: number): string {
  return `${API_URL}/sessions/${sessionId}/attendances/export`;
}
