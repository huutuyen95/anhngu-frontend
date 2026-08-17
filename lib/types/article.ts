export type ArticleCategory = {
  id: number;
  name: string;
  order: number;
  articles_count?: number;
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  category_id: number | null;
  category: Pick<ArticleCategory, "id" | "name"> | null;
  thumbnail_url: string | null;
  excerpt: string | null;
  body?: string | null;
  reading_minutes: number;
  is_published: boolean;
  published_at: string | null;
  view_count: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ArticleListResponse = {
  data: Article[];
  meta: { current_page: number; last_page: number; total: number };
};

export type ArticlePayload = {
  title?: string;
  category_id?: number | null;
  thumbnail_url?: string | null;
  excerpt?: string | null;
  body?: string;
  is_published?: boolean;
};
