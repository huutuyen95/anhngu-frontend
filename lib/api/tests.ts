import { api, apiForm, getToken } from "@/lib/api";
import type {
  StudentTestFilters,
  StudentTestListResponse,
  Test,
  TestCategory,
  TestDetail,
  TestFilters,
  TestListResponse,
  TestPart,
  TestPreflight,
  WordImportPreview,
} from "@/lib/types/test";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function listTests(filters: TestFilters): Promise<TestListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return api<TestListResponse>(`/admin/tests${query ? `?${query}` : ""}`);
}

/* ── Khu học viên ──────────────────────────────────────────────────────────── */

/**
 * Danh sách đề tự luyện của học viên — `GET /tests` (KHÔNG phải `/admin/tests`).
 * Backend chỉ trả đề đã bật "Hiện trong thư viện" cho lớp của học viên.
 */
export function listStudentTests(
  filters: StudentTestFilters,
): Promise<StudentTestListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return api<StudentTestListResponse>(`/tests${query ? `?${query}` : ""}`);
}

export type StartedAttempt = {
  attempt_id: number;
  started_at: string;
  deadline: string;
  mission_id: number | null;
  /** `assignment` = bài cô giao trong lớp · `library` = em tự luyện. */
  source: "assignment" | "library";
};

/**
 * Tạo lượt làm mới cho một đề.
 *
 * `missionId` quyết định NGUỒN của lượt và hai nguồn tách hẳn nhau ở backend:
 *   - có `missionId` (vào từ lớp học) → tính vào tiến trình + báo cáo của lớp, bị giới hạn
 *     số lần theo `attempts_allowed` của nhiệm vụ;
 *   - không có (vào từ Thư viện) → tự luyện, làm lại thoải mái, KHÔNG đụng tới lớp.
 */
export function startAttempt(
  testId: number | string,
  missionId?: number | null,
): Promise<StartedAttempt> {
  return api<StartedAttempt>(`/tests/${testId}/attempts`, {
    method: "POST",
    body: JSON.stringify(missionId ? { mission_id: missionId } : {}),
  });
}

/**
 * Nộp bản ghi âm của một câu Nói. Trả về URL để màn làm bài phát lại ngay.
 *
 * Đi qua endpoint riêng của lượt làm (KHÔNG phải `/media/upload`): backend cần kiểm câu đó
 * đúng là câu speaking của đề trong lượt này, và tự xoá file cũ khi em ghi lại.
 */
export function uploadAttemptAudio(
  attemptId: number | string,
  questionId: number,
  file: File,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);

  return apiForm(`/attempts/${attemptId}/answers/${questionId}/audio`, form);
}

/** Xoá bản ghi âm đã nộp (nút "Ghi lại"). */
export function deleteAttemptAudio(
  attemptId: number | string,
  questionId: number,
): Promise<{ message: string }> {
  return api(`/attempts/${attemptId}/answers/${questionId}/audio`, { method: "DELETE" });
}

// Đường dẫn FE của luồng làm bài nằm ở `features/tests/routes.ts` — không để lẫn
// vào đây vì route phụ thuộc root (thư viện / lớp học), còn path API thì không.

/* ── Khu quản trị ──────────────────────────────────────────────────────────── */

export type TestPayload = {
  title: string;
  skill: string;
  category_id?: number | null;
  duration_minutes?: number;
  total_score?: number;
  shuffle_questions?: boolean;
  word_limit?: number | null;
  rubric?: string | null;
  /** Cho AI chấm nháp bài viết/nói của đề này. */
  ai_grading?: boolean;
  is_published?: boolean;
};

export function createTest(payload: TestPayload): Promise<{ test: Test }> {
  return api("/admin/tests", { method: "POST", body: JSON.stringify(payload) });
}

export function updateTest(
  id: number,
  payload: Partial<TestPayload>,
): Promise<{ test: Test }> {
  return api(`/admin/tests/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteTest(id: number, force = false): Promise<{ message: string }> {
  return api(`/admin/tests/${id}${force ? "?force=1" : ""}`, { method: "DELETE" });
}

export function duplicateTest(id: number): Promise<{ test: Test }> {
  return api(`/admin/tests/${id}/duplicate`, { method: "POST" });
}

export function moveTestCategory(id: number, categoryId: number | null): Promise<{ test: Test }> {
  return api(`/admin/tests/${id}/category`, { method: "PATCH", body: JSON.stringify({ category_id: categoryId }) });
}

export function getPreflight(id: number): Promise<TestPreflight> {
  return api(`/admin/tests/${id}/preflight`);
}

// ── Thư mục đề (cây theo lớp) ──
export function listTestCategories(classroomId?: number | null): Promise<{ data: TestCategory[] }> {
  const q = classroomId ? `?classroom_id=${classroomId}` : "";
  return api(`/admin/test-categories${q}`);
}

// ── Import Word (A4imp) ──
export async function importWordDryRun(file: File): Promise<WordImportPreview> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const res = await fetch(`${API_URL}/admin/tests/import-word`, {
    method: "POST",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Không phân tích được file.");
  return data;
}

export function importWordCommit(payload: {
  title: string;
  skill: string;
  category_id?: number | null;
  parts: TestPart[];
}): Promise<{ test: Test }> {
  return api("/admin/tests/import-word/commit", { method: "POST", body: JSON.stringify(payload) });
}

export async function downloadWordTemplate(): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}/admin/tests/word-template`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error("Không tải được file mẫu.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-de-thi.docx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function syncTestCategories(payload: {
  classroom_id: number | null;
  categories: { id: number | null; name: string; parent_id?: number | null; order: number }[];
  deleted_ids: number[];
}): Promise<{ data: TestCategory[]; moved_count: number }> {
  return api("/admin/test-categories/sync", { method: "PUT", body: JSON.stringify(payload) });
}

export function getTestStructure(id: number): Promise<{ test: TestDetail }> {
  return api(`/admin/tests/${id}`);
}

export function saveTestStructure(
  id: number,
  parts: TestPart[],
): Promise<{ test: TestDetail }> {
  return api(`/admin/tests/${id}/structure`, {
    method: "PUT",
    body: JSON.stringify({ parts }),
  });
}
