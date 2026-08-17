"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenText, CalendarDays, ChevronDown, Clock3, Eye, List } from "lucide-react";
import { readArticle } from "@/lib/api/articles";
import type { Article } from "@/lib/types/article";

type Heading = { id: string; text: string; level: number };

export default function ArticleReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    readArticle(Number(id)).then((response) => setArticle(response.article)).catch(() => setError(true));
  }, [id]);

  const prepared = useMemo(() => prepareBody(article?.body ?? ""), [article?.body]);

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-8 text-center">
        <p className="font-semibold text-danger">Bài viết không tồn tại hoặc chưa được xuất bản.</p>
        <Link href="/library/articles" className="btn btn-primary mt-4">Về danh sách</Link>
      </div>
    );
  }

  if (!article) return <div className="mx-auto h-96 max-w-4xl animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />;

  return (
    <article className="mx-auto max-w-4xl pb-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-500" aria-label="Điều hướng bài viết">
        <Link href="/library" className="hover:text-accent-700">Thư viện</Link>
        <span>/</span>
        <Link href="/library/articles" className="hover:text-accent-700">Bài viết</Link>
        <span>/</span>
        <span className="max-w-xs truncate text-neutral-700">{article.title}</span>
      </nav>

      <Link href="/library/articles" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-accent-700">
        <ArrowLeft className="size-4" /> Danh sách bài viết
      </Link>

      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-accent-800">
          <BookOpenText className="size-3.5" /> {article.category?.name ?? "Bài viết"}
        </span>
        <h1 className="mt-4 font-display text-[clamp(30px,5vw,48px)] font-bold leading-tight text-text">{article.title}</h1>
        {article.excerpt && <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">{article.excerpt}</p>}
        <div className="mt-5 flex flex-wrap gap-4 border-b border-divider pb-6 text-sm font-semibold text-neutral-500">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> {formatDate(article.published_at)}</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" /> {article.reading_minutes} phút đọc</span>
          <span className="inline-flex items-center gap-1.5"><Eye className="size-4" /> {article.view_count} lượt xem</span>
        </div>
      </header>

      {article.thumbnail_url && (
        <div className="mt-7 overflow-hidden rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 shadow-[var(--shadow-sm)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.thumbnail_url} alt="" className="aspect-[16/8] w-full object-cover" />
        </div>
      )}

      {prepared.headings.length > 0 && (
        <details open className="group mt-7 rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-200 p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-lg font-bold text-text">
            <List className="size-5 text-accent-700" /> Mục lục
            <ChevronDown className="ml-auto size-5 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-4 flex flex-col gap-2 border-t border-divider pt-4">
            {prepared.headings.map((heading, index) => (
              <li key={heading.id} className={heading.level === 3 ? "ml-5" : ""}>
                <a href={`#${heading.id}`} className="text-sm font-semibold text-neutral-700 underline-offset-4 hover:text-accent-700 hover:underline">{index + 1}. {heading.text}</a>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="doc-prose mt-8 text-[16px] leading-[1.9] text-neutral-700" dangerouslySetInnerHTML={{ __html: prepared.html }} />
    </article>
  );
}

function prepareBody(body: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  let index = 0;
  const html = body.replace(/<h([23])([^>]*)>(.*?)<\/h\1>/gi, (_match, level: string, attributes: string, content: string) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    const id = `muc-${++index}`;
    headings.push({ id, text, level: Number(level) });
    return `<h${level}${attributes} id="${id}">${content}</h${level}>`;
  });
  return { html, headings };
}

function formatDate(value: string | null): string {
  if (!value) return "Chưa rõ ngày";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}
