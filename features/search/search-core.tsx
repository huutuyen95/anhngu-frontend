"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Layers, FileText, Type, type LucideIcon } from "lucide-react";
import { searchContent } from "@/lib/api/search";
import type { SearchItem, SearchResults } from "@/lib/types/search";
import { cn } from "@/lib/utils";

export const GROUPS: { key: keyof SearchResults; label: string; icon: LucideIcon }[] = [
  { key: "tests", label: "Đề thi", icon: ClipboardList },
  { key: "cards", label: "Từ vựng", icon: Type },
  { key: "decks", label: "Bộ từ vựng", icon: Layers },
  { key: "documents", label: "Tài liệu & Bài giảng", icon: FileText },
];

/** Hook tìm kiếm: debounce query → kết quả nhóm + điều hướng bàn phím. */
export function useContentSearch(activeWhen: boolean) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!activeWhen) return;
    const term = q.trim();
    if (term.length < 1) { setResults(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      searchContent(term)
        .then((r) => { setResults(r); setActive(0); })
        .catch(() => setResults({ tests: [], cards: [], decks: [], documents: [] }))
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q, activeWhen]);

  const flat = useMemo(() => (results ? GROUPS.flatMap((g) => results[g.key]) : []), [results]);
  const reset = () => { setQ(""); setResults(null); setActive(0); };

  function moveKey(e: React.KeyboardEvent, onSelect: (i: SearchItem) => void) {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % flat.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + flat.length) % flat.length); }
    else if (e.key === "Enter") { e.preventDefault(); const it = flat[active]; if (it) onSelect(it); }
  }

  return { q, setQ, results, loading, active, setActive, flat, reset, moveKey };
}

/** Thân danh sách kết quả (dùng chung cho ô inline lẫn modal). */
export function SearchResultsPanel({
  q, loading, results, flat, active, setActive, onSelect,
}: {
  q: string;
  loading: boolean;
  results: SearchResults | null;
  flat: SearchItem[];
  active: number;
  setActive: (i: number) => void;
  onSelect: (item: SearchItem) => void;
}) {
  const term = q.trim();
  if (term.length < 1) {
    return <p className="px-3 py-8 text-center text-sm text-text-muted">Gõ để tìm đề thi, bộ từ vựng, tài liệu…</p>;
  }
  if (loading && !results) {
    return (
      <div className="flex flex-col gap-2 p-1">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-alt" />)}
      </div>
    );
  }
  if (flat.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-text-muted">Không tìm thấy nội dung nào khớp “{term}”.</p>;
  }

  let idx = -1;
  return (
    <>
      {GROUPS.map((g) => {
        const items = results?.[g.key] ?? [];
        if (items.length === 0) return null;
        const Icon = g.icon;
        return (
          <div key={g.key} className="mb-1">
            <p className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-text-muted">{g.label}</p>
            {items.map((item) => {
              idx++;
              const isActive = idx === active;
              const at = flat.indexOf(item);
              return (
                <button
                  key={`${g.key}-${item.id}`}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                  onMouseMove={() => setActive(at)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-brand-soft" : "hover:bg-surface-alt")}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-text-secondary">
                    <Icon className="size-[18px]" strokeWidth={2.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text">{item.title}</span>
                    <span className="block text-xs text-text-muted">{item.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
