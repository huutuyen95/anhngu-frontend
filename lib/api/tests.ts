import { api } from "@/lib/api";
import type {
  Test,
  TestDetail,
  TestFilters,
  TestListResponse,
  TestPart,
} from "@/lib/types/test";

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
  duration_minutes?: number;
  total_score?: number;
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

export function deleteTest(id: number): Promise<{ message: string }> {
  return api(`/admin/tests/${id}`, { method: "DELETE" });
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
