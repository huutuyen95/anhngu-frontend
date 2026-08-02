export type DocType = "document" | "lecture";

export type CategoryRef = { id: number; name: string };
export type ClassroomRef = { id: number; name: string };

export type Attachment = {
  id: number;
  name: string;
  url: string;
  size_bytes: number;
  mime: string | null;
  order: number;
};

export type Doc = {
  id: number;
  type: DocType;
  title: string;
  slug: string;
  category: CategoryRef | null;
  category_id: number | null;
  thumbnail_url: string | null;
  excerpt: string | null;
  reading_minutes: number;
  is_published: boolean;
  view_count: number;
  attachments?: Attachment[];
  attachments_count?: number;
  classrooms?: ClassroomRef[];
  classroom_ids?: number[];
  body?: string;
  updated_at?: string | null;
};

export type DocListMeta = {
  current_page: number;
  last_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
  per_page?: number;
};

export type DocListResponse = {
  data: Doc[];
  meta: DocListMeta;
};

export type DocCategory = { id: number; name: string; order: number; documents_count: number };

export type StorageUsage = {
  total_bytes: number;
  limit_bytes: number;
  by_type: { type: string; bytes: number }[];
  biggest: { id: number; name: string; ext: string; size: number; parent: string | null }[];
};

export type EmbedPreview = {
  recognized: boolean;
  provider?: string;
  video_id?: string;
  embed_url?: string;
  thumbnail?: string;
  message?: string;
};

export function formatBytes(b: number): string {
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(1) + " GB";
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(1) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(0) + " KB";
  return b + " B";
}

/** Màu pastel ổn định theo tên danh mục (dùng token brand, không hex thô). */
const CAT_PALETTE = [
  { cover: "bg-skill-speaking-soft", chip: "bg-skill-speaking-soft text-skill-speaking" },
  { cover: "bg-accent-soft", chip: "bg-accent-soft text-warning" },
  { cover: "bg-skill-listening-soft", chip: "bg-skill-listening-soft text-info" },
  { cover: "bg-skill-writing-soft", chip: "bg-skill-writing-soft text-success-bold" },
  { cover: "bg-brand-soft", chip: "bg-brand-soft text-brand" },
];
export function categoryColor(name?: string | null): { cover: string; chip: string } {
  if (!name) return { cover: "bg-surface-alt", chip: "bg-surface-alt text-text-secondary" };
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CAT_PALETTE[h % CAT_PALETTE.length];
}
