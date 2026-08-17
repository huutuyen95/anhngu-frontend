import { api } from "@/lib/api";
import type { Article, ArticleCategory, ArticleListResponse, ArticlePayload } from "@/lib/types/article";

export function listArticles(filters: { q?: string; category_id?: string; is_published?: string; page?: string } = {}): Promise<ArticleListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return api(`/articles${query ? `?${query}` : ""}`);
}

export function getArticle(id: number): Promise<{ article: Article }> {
  return api(`/articles/${id}`);
}

export function createArticle(payload: ArticlePayload): Promise<{ article: Article }> {
  return api("/articles", { method: "POST", body: JSON.stringify(payload) });
}

export function updateArticle(id: number, payload: ArticlePayload): Promise<{ article: Article }> {
  return api(`/articles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function publishArticle(id: number, isPublished: boolean): Promise<{ is_published: boolean }> {
  return api(`/articles/${id}/publish`, { method: "PATCH", body: JSON.stringify({ is_published: isPublished }) });
}

export function deleteArticle(id: number): Promise<{ message: string }> {
  return api(`/articles/${id}`, { method: "DELETE" });
}

export function listArticleCategories(): Promise<{ data: ArticleCategory[] }> {
  return api("/article-categories");
}

export function syncArticleCategories(payload: {
  categories: { id: number | null; name: string; order: number }[];
  deleted_ids: number[];
}): Promise<{ data: ArticleCategory[] }> {
  return api("/article-categories/sync", { method: "PUT", body: JSON.stringify(payload) });
}

export function listLibraryArticles(filters: { category_id?: string; q?: string; sort?: "newest" | "oldest" } = {}): Promise<{ data: Article[] }> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return api(`/library/articles${query ? `?${query}` : ""}`);
}

export function listLibraryArticleCategories(): Promise<{ data: ArticleCategory[] }> {
  return api("/library/articles/categories");
}

export function readArticle(id: number): Promise<{ article: Article }> {
  return api(`/articles/${id}/read`);
}
