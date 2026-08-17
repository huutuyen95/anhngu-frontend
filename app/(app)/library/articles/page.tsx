"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenText, CalendarDays, Clock3, Search } from "lucide-react";
import { listLibraryArticleCategories, listLibraryArticles } from "@/lib/api/articles";
import type { Article, ArticleCategory } from "@/lib/types/article";
import { cn } from "@/lib/utils";

export default function ArticleLibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    listLibraryArticleCategories().then((response) => setCategories(response.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    listLibraryArticles({ category_id: categoryId, q: submittedQuery, sort })
      .then((response) => setArticles(response.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [categoryId, sort, submittedQuery]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="pb-8">
      <header className="flex items-center gap-3">
        <Link href="/library" aria-label="Về Thư viện" className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-divider bg-neutral-100 text-neutral-700 hover:border-accent-300 hover:text-accent-700">
          <ArrowLeft className="size-5" strokeWidth={2.75} />
        </Link>
        <span className="flex size-11 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <BookOpenText className="size-5" strokeWidth={2.75} />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">Thư viện</p>
          <h1 className="font-display text-2xl font-bold text-text">Bài viết</h1>
        </div>
      </header>

      <section className="mt-7 rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-4 shadow-[var(--shadow-sm)] sm:p-6">
        <form className="relative" onSubmit={(event) => {
          event.preventDefault();
          const next = query.trim();
          setError(false);
          if (next === submittedQuery) load();
          else { setLoading(true); setSubmittedQuery(next); }
        }}>
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bài viết…" className="h-12 w-full rounded-full border-[1.5px] border-divider bg-surface pl-11 pr-4 text-sm text-text outline-none focus-visible:border-accent-500 focus-visible:ring-2 focus-visible:ring-accent-100" />
        </form>

        <div className="mt-5 border-t border-divider pt-5">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[1.2px] text-neutral-600">Danh mục</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterChip active={!categoryId} onClick={() => { setLoading(true); setError(false); setCategoryId(""); }}>Tất cả</FilterChip>
            {categories.map((category) => (
              <FilterChip key={category.id} active={categoryId === String(category.id)} onClick={() => { setLoading(true); setError(false); setCategoryId(String(category.id)); }}>
                {category.name}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-neutral-700">{loading ? "Đang tải…" : `${articles.length} bài viết`}</p>
        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
          <span className="hidden sm:inline">Sắp xếp</span>
          <select value={sort} onChange={(event) => { setLoading(true); setError(false); setSort(event.target.value as "newest" | "oldest"); }} className="h-10 rounded-full border-[1.5px] border-divider bg-neutral-100 px-4 text-sm font-semibold text-text outline-none focus-visible:border-accent-500">
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />)}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-8 text-center">
          <p className="font-semibold text-danger">Chưa tải được bài viết.</p>
          <button onClick={() => { setLoading(true); setError(false); load(); }} className="btn btn-primary mt-4">Thử lại</button>
        </div>
      ) : articles.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent-100 text-accent-700"><BookOpenText className="size-6" /></span>
          <h2 className="mt-4 font-display text-xl font-bold text-text">Chưa có bài viết phù hợp</h2>
          <p className="mt-1 text-sm text-neutral-600">Em thử đổi danh mục hoặc từ khoá nhé.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
        </ul>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <li>
      <Link href={`/library/articles/${article.id}`} className="group flex h-full min-h-80 flex-col overflow-hidden rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-accent-300 hover:shadow-[var(--shadow-md)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transform-none">
        <div className="aspect-[16/9] overflow-hidden bg-accent-100">
          {article.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.thumbnail_url} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" />
          ) : (
            <span className="flex size-full items-center justify-center text-accent-700"><BookOpenText className="size-9" /></span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <span className="w-fit rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-800">{article.category?.name ?? "Bài viết"}</span>
          <h2 className="mt-3 line-clamp-2 font-display text-xl font-bold leading-snug text-text">{article.title}</h2>
          {article.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600">{article.excerpt}</p>}
          <div className="mt-auto flex items-center gap-3 border-t border-divider pt-4 text-xs font-semibold text-neutral-500">
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(article.published_at)}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {article.reading_minutes} phút</span>
            <ArrowRight className="ml-auto size-4 text-accent-700 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
          </div>
        </div>
      </Link>
    </li>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} disabled={active} onClick={onClick} className={cn("h-10 shrink-0 rounded-full border-[1.5px] px-4 text-sm font-bold transition-colors", active ? "cursor-default border-accent-500 bg-accent-100 text-accent-800" : "border-divider bg-surface text-neutral-700 hover:border-accent-300")}>
      {children}
    </button>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Chưa rõ ngày";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}
