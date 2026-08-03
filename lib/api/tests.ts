import { api, getToken } from "@/lib/api";
import type {
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

export type TestPayload = {
  title: string;
  skill: string;
  category_id?: number | null;
  duration_minutes?: number;
  total_score?: number;
  shuffle_questions?: boolean;
  word_limit?: number | null;
  rubric?: string | null;
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
