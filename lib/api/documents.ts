import { api, getToken } from "@/lib/api";
import type {
  Attachment,
  Doc,
  DocCategory,
  DocListResponse,
  DocType,
  EmbedPreview,
  StorageUsage,
} from "@/lib/types/document";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Admin ──

export type DocFilters = { type?: string; q?: string; category_id?: string; is_published?: string; page?: string };

export function listDocuments(f: DocFilters = {}): Promise<DocListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) qs.set(k, String(v));
  const q = qs.toString();
  return api(`/documents${q ? `?${q}` : ""}`);
}
export function getDocument(id: number): Promise<{ document: Doc }> {
  return api(`/documents/${id}`);
}
export type DocPayload = {
  type?: DocType;
  title?: string;
  category_id?: number | null;
  thumbnail_url?: string | null;
  body?: string;
  classroom_ids?: number[];
  is_published?: boolean;
};
export function createDocument(p: DocPayload): Promise<{ document: Doc }> {
  return api("/documents", { method: "POST", body: JSON.stringify(p) });
}
export function updateDocument(id: number, p: DocPayload): Promise<{ document: Doc }> {
  return api(`/documents/${id}`, { method: "PUT", body: JSON.stringify(p) });
}
export function publishDocument(id: number, isPublished: boolean): Promise<{ is_published: boolean }> {
  return api(`/documents/${id}/publish`, { method: "PATCH", body: JSON.stringify({ is_published: isPublished }) });
}
export function deleteDocument(id: number): Promise<{ message: string; sessions: { id: number; title: string; classroom: string }[] }> {
  return api(`/documents/${id}`, { method: "DELETE" });
}

export function listDocCategories(): Promise<{ data: DocCategory[] }> {
  return api("/document-categories");
}
export function syncDocCategories(payload: {
  categories: { id: number | null; name: string; order: number }[];
  deleted_ids: number[];
}): Promise<{ data: DocCategory[]; moved_count: number }> {
  return api("/document-categories/sync", { method: "PUT", body: JSON.stringify(payload) });
}

export function getStorageUsage(): Promise<StorageUsage> {
  return api("/storage/usage");
}
export function bulkDeleteAttachments(ids: number[]): Promise<{ deleted: number }> {
  return api("/attachments/bulk", { method: "DELETE", body: JSON.stringify({ ids }) });
}
export function deleteAttachment(id: number): Promise<{ message: string }> {
  return api(`/attachments/${id}`, { method: "DELETE" });
}
export function reorderAttachments(docId: number, ids: number[]): Promise<{ message: string }> {
  return api(`/documents/${docId}/attachments/reorder`, { method: "PUT", body: JSON.stringify({ ids }) });
}
export function embedPreview(url: string): Promise<EmbedPreview> {
  return api<EmbedPreview>("/media/embed-preview", { method: "POST", body: JSON.stringify({ url }) });
}

async function uploadForm(path: string, file: File): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message ?? "Tải lên thất bại.") as Error & { code?: string };
    err.code = data?.code;
    throw err;
  }
  return data;
}
export function uploadAttachment(docId: number, file: File): Promise<{ attachment: Attachment }> {
  return uploadForm(`/documents/${docId}/attachments`, file) as Promise<{ attachment: Attachment }>;
}
export function uploadThumbnail(docId: number, file: File): Promise<{ thumbnail_url: string }> {
  return uploadForm(`/documents/${docId}/thumbnail`, file) as Promise<{ thumbnail_url: string }>;
}

// ── Student ──

export function listLibraryDocuments(f: { q?: string; category_id?: string } = {}): Promise<{ data: Doc[] }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) qs.set(k, String(v));
  const q = qs.toString();
  return api(`/library/documents${q ? `?${q}` : ""}`);
}
export function readDocument(id: number): Promise<{ document: Doc; my_progress: number; completed: boolean }> {
  return api(`/documents/${id}/read`);
}
export function reportView(id: number, progressPct: number): Promise<{ progress_pct: number; completed: boolean; mission_done: boolean }> {
  return api(`/documents/${id}/view`, { method: "POST", body: JSON.stringify({ progress_pct: progressPct }) });
}
