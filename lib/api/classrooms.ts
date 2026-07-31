import { api, getToken } from "@/lib/api";
import type {
  Classroom,
  ClassroomListResponse,
  CoverPreset,
} from "@/lib/types/classroom";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type ClassroomFilters = {
  q?: string;
  status?: string;
  page?: string;
};

export function listClassrooms(
  filters: ClassroomFilters = {},
): Promise<ClassroomListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) qs.set(k, String(v));
  }
  const q = qs.toString();
  return api<ClassroomListResponse>(`/classrooms${q ? `?${q}` : ""}`);
}

export function getClassroom(id: number): Promise<{ classroom: Classroom }> {
  return api(`/classrooms/${id}`);
}

export type ClassroomPayload = {
  name: string;
  cover_url?: string | null;
  description?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
};

export function createClassroom(
  payload: ClassroomPayload,
): Promise<{ classroom: Classroom; warning: string | null }> {
  return api("/classrooms", { method: "POST", body: JSON.stringify(payload) });
}

export function updateClassroom(
  id: number,
  payload: ClassroomPayload,
): Promise<{ classroom: Classroom }> {
  return api(`/classrooms/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteClassroom(
  id: number,
  confirm = false,
): Promise<{ message: string }> {
  return api(`/classrooms/${id}${confirm ? "?confirm=1" : ""}`, {
    method: "DELETE",
  });
}

export function listCoverPresets(): Promise<{ data: CoverPreset[] }> {
  return api("/media/class-covers");
}

/** Upload ảnh bìa (multipart) → trả URL. */
export async function uploadCover(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const res = await fetch(`${API_URL}/media/upload`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Tải ảnh thất bại.");
  return data;
}
