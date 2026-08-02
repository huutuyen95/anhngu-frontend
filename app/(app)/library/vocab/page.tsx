"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookA } from "lucide-react";
import { listLibraryDecks } from "@/lib/api/decks";
import type { LibraryDeck } from "@/lib/types/deck";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function VocabLibraryPage() {
  const [decks, setDecks] = useState<LibraryDeck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLibraryDecks().then((r) => setDecks(r.data)).catch(() => setDecks([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Từ vựng" icon={<BookA className="size-5" />} backHref="/library" />

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-alt" />)}
        </div>
      ) : decks.length === 0 ? (
        <EmptyState icon={<BookA className="size-7" />} title="Chưa có bộ từ nào trong thư viện." />
      ) : (
        <ul className="flex flex-col gap-3">
          {decks.map((d) => {
            const done = d.cards_count > 0 && d.learned_count >= d.cards_count;
            const started = d.learned_count > 0;
            return (
              <li key={d.id}>
                <Link href={`/library/vocab/${d.id}`} className="flex items-center gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(58,51,48,0.08)]">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand"><BookA className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold text-text">{d.name}</p>
                    <p className="text-xs text-text-muted">{d.learned_count}/{d.cards_count} thẻ đã học</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${d.cards_count ? (d.learned_count / d.cards_count) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)]">
                    {done ? "Ôn lại" : started ? "Học tiếp" : "Bắt đầu học"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
