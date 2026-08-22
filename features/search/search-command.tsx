"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { SearchItem } from "@/lib/types/search";
import { SearchResultsPanel, useContentSearch } from "@/features/search/search-core";

/** Tìm nhanh dạng modal — dùng cho mobile (nút search trên header). */
export function SearchCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const s = useContentSearch(open);

  useEffect(() => {
    if (open) { s.reset(); setTimeout(() => inputRef.current?.focus(), 20); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function go(item: SearchItem) { onClose(); router.push(item.url); }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Tìm kiếm">
      <button className="absolute inset-0 bg-black/40" aria-label="Đóng" onClick={onClose} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface shadow-lg">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-text-muted" strokeWidth={2.5} />
          <input
            ref={inputRef}
            value={s.q}
            onChange={(e) => s.setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); else s.moveKey(e, go); }}
            placeholder="Tìm đề, từ vựng, tài liệu…"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
          />
          <button onClick={onClose} aria-label="Đóng" className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:text-text">
            <X className="size-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          <SearchResultsPanel q={s.q} loading={s.loading} results={s.results} flat={s.flat} active={s.active} setActive={s.setActive} onSelect={go} />
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-text-muted">
          <span><kbd className="rounded border border-border px-1">↑</kbd> <kbd className="rounded border border-border px-1">↓</kbd> di chuyển</span>
          <span><kbd className="rounded border border-border px-1">↵</kbd> mở</span>
          <span><kbd className="rounded border border-border px-1">Esc</kbd> đóng</span>
        </div>
      </div>
    </div>
  );
}
