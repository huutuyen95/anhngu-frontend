import { api, ApiError, getToken } from "@/lib/api";
import type {
  ImportPreview,
  ImportResult,
  Student,
  StudentFilters,
  StudentListResponse,
} from "@/lib/types/student";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function listStudents(filters: StudentFilters): Promise<StudentListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return api<StudentListResponse>(`/students${query ? `?${query}` : ""}`);
}

export type StudentPayload = {
  name: string;
  email?: string;
  phone?: string | null;
  note?: string | null;
  avatar_url?: string | null;
  classroom_ids?: number[];
};

export function createStudent(
  payload: StudentPayload,
): Promise<{ student: Student; temp_password: string }> {
  return api("/students", { method: "POST", body: JSON.stringify(payload) });
}

export function updateStudent(
  id: number,
  payload: Omit<StudentPayload, "email">,
): Promise<{ student: Student }> {
  return api(`/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function setStudentStatus(
  id: number,
  isActive: boolean,
): Promise<{ student: Student }> {
  return api(`/students/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function deleteStudent(id: number, force = false): Promise<{ message: string }> {
  return api(`/students/${id}${force ? "?force=1" : ""}`, { method: "DELETE" });
}

export function restoreStudent(id: number): Promise<{ student: Student }> {
  return api(`/students/${id}/restore`, { method: "POST" });
}

export function resetStudentPassword(id: number): Promise<{ temp_password: string }> {
  return api(`/students/${id}/reset-password`, { method: "POST" });
}

export type BulkAction = "lock" | "unlock" | "delete" | "assign_class";

export function bulkStudents(payload: {
  action: BulkAction;
  ids: number[];
  classroom_id?: number;
  mode?: "add" | "move";
}): Promise<{ affected: number }> {
  return api("/students/bulk", { method: "POST", body: JSON.stringify(payload) });
}

export function importTemplateUrl(): string {
  return `${API_URL}/students/import-template`;
}

/** Kiểm tra email trùng (blur ở form). */
export function checkStudentEmail(email: string, ignoreId?: number): Promise<{ available: boolean }> {
  const qs = new URLSearchParams({ email });
  if (ignoreId) qs.set("ignore_id", String(ignoreId));
  return api(`/students/check-email?${qs.toString()}`);
}

/** Import cần multipart nên gọi fetch trực tiếp (api() ép JSON). */
async function importForm(
  file: File,
  dryRun: boolean,
  onDuplicate?: "skip" | "update",
  batch?: { offset: number; limit: number },
): Promise<Response> {
  const form = new FormData();
  form.append("file", file);
  if (onDuplicate) form.append("on_duplicate", onDuplicate);
  if (batch) {
    form.append("offset", String(batch.offset));
    form.append("limit", String(batch.limit));
  }
  const token = getToken();
  return fetch(`${API_URL}/students/import?dry_run=${dryRun ? 1 : 0}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
}

async function parseImport<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? "Import thất bại.", data?.errors);
  }
  return data as T;
}

export async function previewImport(file: File): Promise<ImportPreview> {
  return parseImport<ImportPreview>(await importForm(file, true));
}

const IMPORT_BATCH_SIZE = 100;

export async function commitImport(
  file: File,
  totalRows: number,
  onDuplicate: "skip" | "update" = "skip",
  onProgress?: (completed: number, total: number) => void,
): Promise<ImportResult> {
  const result: ImportResult = {
    created: [],
    summary: { ok: 0, updated: 0, duplicate: 0, error: 0 },
  };

  for (let offset = 0; offset < totalRows; offset += IMPORT_BATCH_SIZE) {
    const batch = await parseImport<ImportResult>(
      await importForm(file, false, onDuplicate, {
        offset,
        limit: Math.min(IMPORT_BATCH_SIZE, totalRows - offset),
      }),
    );
    result.created.push(...batch.created);
    result.summary.ok += batch.summary.ok;
    result.summary.updated = (result.summary.updated ?? 0) + (batch.summary.updated ?? 0);
    result.summary.duplicate += batch.summary.duplicate;
    result.summary.error += batch.summary.error;
    onProgress?.(Math.min(offset + IMPORT_BATCH_SIZE, totalRows), totalRows);
  }

  return result;
}
