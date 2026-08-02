"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Folder, Search, Clock } from "lucide-react";
import { listLibraryDocuments } from "@/lib/api/documents";
import type { Doc } from "@/lib/types/document";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function DocumentLibraryPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

  useEffect(() => {
    listLibraryDocuments().then((r) => setDocs(r.data)).catch(() => setDocs([])).finally(() => setLoading(false));
  }, []);

  const cats = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of docs) if (d.category) m.set(String(d.category.id), d.category.name);
    return [...m.entries()];
  }, [docs]);

  const shown = docs.filter((d) =>
    (!q || d.title.toLowerCase().includes(q.toLowerCase())) &&
    (!cat || String(d.category?.id) === cat)
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Tài liệu" icon={<Folder className="size-5" />} backHref="/library" />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tài liệu…"
            className="h-10 w-full rounded-full border-[1.5px] border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:border-brand" />
        </div>
        {cats.length > 0 && (
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 rounded-full border-[1.5px] border-border bg-surface px-3 text-sm outline-none focus-visible:border-brand">
            <option value="">Tất cả danh mục</option>
            {cats.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-alt" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={<Folder className="size-7" />} title="Chưa có tài liệu nào." />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((d) => (
            <li key={d.id}>
              <Link href={`/library/documents/${d.id}`} className="flex gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(58,51,48,0.08)]">
                {d.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumbnail_url} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Folder className="size-7" /></span>
                )}
                <div className="min-w-0 flex-1">
                  {d.category && <span className="text-xs font-semibold text-brand">{d.category.name}</span>}
                  <p className="font-display text-base font-bold text-text">{d.title}</p>
                  {d.excerpt && <p className="line-clamp-2 text-sm text-text-secondary">{d.excerpt}</p>}
                  <p className="mt-1 flex items-center gap-1 text-xs text-text-muted"><Clock className="size-3.5" /> {d.reading_minutes} phút đọc</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
