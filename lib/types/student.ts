export type ClassroomRef = { id: number; name: string };

export type Student = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  is_active: boolean;
  classrooms?: ClassroomRef[];
  in_progress_attempts_count?: number;
  created_at: string | null;
  deleted_at: string | null;
};

export type StudentListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type StudentListResponse = { data: Student[]; meta: StudentListMeta };

export type StudentFilters = {
  q?: string;
  classroom_id?: string;
  is_active?: string; // "" | "true" | "false"
  trashed?: string; // "" | "1"
  sort?: string;
  dir?: "asc" | "desc";
  page?: string;
  per_page?: string;
};

export type ImportPreviewRow = {
  row: number;
  name: string;
  email: string;
  class: string | null;
  status: "ok" | "duplicate" | "error";
  reasons: string[];
};

export type ImportPreview = {
  rows: ImportPreviewRow[];
  summary: { ok: number; duplicate: number; error: number };
};

export type ImportResult = {
  created: { email: string; password: string }[];
  summary: { ok: number; duplicate: number; error: number };
};
