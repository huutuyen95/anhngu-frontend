"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenText, ChevronLeft, ChevronRight, FolderCog, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createArticle, deleteArticle, listArticleCategories, listArticles, publishArticle } from "@/lib/api/articles";
import type { Article, ArticleCategory } from "@/lib/types/article";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArticleCategoryManagerModal } from "@/features/articles/article-category-manager-modal";

export default function TeacherArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [published, setPublished] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deleting, setDeleting] = useState<Article | null>(null);

  const loadCategories = useCallback(() => {
    listArticleCategories().then((response) => setCategories(response.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    listArticles({
      q: submittedQuery,
      category_id: categoryId,
      is_published: published,
      page: String(page),
    })
      .then((response) => {
        setArticles(response.data);
        setLastPage(response.meta.last_page);
        setTotal(response.meta.total);
      })
      .catch(() => toast.error("Không tải được danh sách bài viết."))
      .finally(() => setLoading(false));
  }, [categoryId, page, published, submittedQuery]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setCreating(true);
    try {
      const response = await createArticle({ title: "Bài viết mới", body: "", is_published: false });
      router.push(`/teacher/articles/${response.article.id}/edit`);
    } catch {
      toast.error("Không tạo được bài viết.");
      setCreating(false);
    }
  }

  async function togglePublished(article: Article) {
    const next = !article.is_published;
    setArticles((current) => current.map((item) => item.id === article.id ? { ...item, is_published: next } : item));
    try {
      await publishArticle(article.id, next);
    } catch {
      setArticles((current) => current.map((item) => item.id === article.id ? { ...item, is_published: !next } : item));
      toast.error("Không đổi được trạng thái xuất bản.");
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteArticle(deleting.id);
      toast.success("Đã xoá bài viết.");
      setDeleting(null);
      load();
    } catch {
      toast.error("Không xoá được bài viết.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Bài viết</h1>
          <p className="mt-1 text-sm text-text-secondary">Soạn và xuất bản nội dung đọc cho Thư viện học sinh.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" iconLeft={<FolderCog className="size-4" />} onClick={() => setCategoryOpen(true)}>Danh mục</Button>
          <Button iconLeft={<Plus className="size-4" />} onClick={create} loading={creating}>Tạo bài viết</Button>
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const next = query.trim();
            if (next === submittedQuery && page === 1) load();
            else { setLoading(true); setPage(1); setSubmittedQuery(next); }
          }}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bài viết…" className="pl-10" />
        </form>
        <Select value={categoryId} onChange={(event) => { setLoading(true); setPage(1); setCategoryId(event.target.value); }}>
          <option value="">Mọi danh mục</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
        <Select value={published} onChange={(event) => { setLoading(true); setPage(1); setPublished(event.target.value); }}>
          <option value="">Mọi trạng thái</option>
          <option value="true">Đã xuất bản</option>
          <option value="false">Bản nháp</option>
        </Select>
      </div>

      <p className="mt-4 text-sm font-semibold text-text-secondary">{total} bài viết</p>

      {loading ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-surface-alt" />)}
        </div>
      ) : articles.length === 0 ? (
        <div className="mt-3 rounded-2xl border-[1.5px] border-border bg-surface p-8">
          <EmptyState icon={<BookOpenText className="size-7" />} title="Chưa có bài viết phù hợp" action={<Button size="sm" onClick={create}>Tạo bài viết</Button>} />
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="flex min-h-72 flex-col overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface shadow-sm">
              <Link href={`/teacher/articles/${article.id}/edit`} className="block h-36 overflow-hidden bg-brand-soft">
                {article.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.thumbnail_url} alt="" className="size-full object-cover transition-transform duration-200 hover:scale-[1.02]" />
                ) : (
                  <span className="flex size-full items-center justify-center text-brand"><BookOpenText className="size-8" /></span>
                )}
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{article.category?.name ?? "Chưa phân loại"}</span>
                  <span className="text-xs text-text-muted">{article.view_count} lượt xem</span>
                </div>
                <Link href={`/teacher/articles/${article.id}/edit`} className="mt-3 line-clamp-2 font-display text-lg font-bold text-text hover:text-brand">{article.title}</Link>
                {article.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{article.excerpt}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                    <Switch checked={article.is_published} onCheckedChange={() => togglePublished(article)} aria-label={`Xuất bản ${article.title}`} />
                    {article.is_published ? "Đang hiện" : "Bản nháp"}
                  </label>
                  <div className="flex gap-1">
                    <Link href={`/teacher/articles/${article.id}/edit`} aria-label={`Sửa ${article.title}`} className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-brand"><Pencil className="size-4" /></Link>
                    <button onClick={() => setDeleting(article)} aria-label={`Xoá ${article.title}`} className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" iconLeft={<ChevronLeft className="size-4" />} disabled={page <= 1} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>Trước</Button>
          <span className="text-sm text-text-secondary">{page}/{lastPage}</span>
          <Button variant="outline" size="sm" iconLeft={<ChevronRight className="size-4" />} disabled={page >= lastPage} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Sau</Button>
        </div>
      )}

      <ArticleCategoryManagerModal open={categoryOpen} onClose={() => setCategoryOpen(false)} onSaved={loadCategories} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Xoá bài viết?" description={deleting ? `“${deleting.title}” sẽ không còn xuất hiện trong Thư viện.` : null} danger confirmLabel="Xoá bài viết" />
    </div>
  );
}
