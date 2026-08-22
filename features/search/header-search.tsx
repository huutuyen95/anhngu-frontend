"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { SearchItem } from "@/lib/types/search";
import { cn } from "@/lib/utils";
import { SearchResultsPanel, useContentSearch } from "@/features/search/search-core";

/** Ô tìm kiếm gõ trực tiếp trên top bar (desktop) — kết quả xổ ngay dưới. */
export function HeaderSearch() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const s = useContentSearch(true);

  // ⌘K / Ctrl+K → focus vào ô tìm kiếm.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setFocused(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click ngoài → đóng dropdown.
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(item: SearchItem) {
    setFocused(false);
    s.reset();
    router.push(item.url);
  }

  const showDropdown = focused && s.q.trim().length >= 1;

  return (
    <div ref={ref} className="relative">
      <div className={cn("flex h-11 w-[300px] items-center gap-2 rounded-full border-[1.5px] bg-surface-alt px-4 transition-colors", focused ? "border-brand" : "border-border")}>
        <Search className="size-[18px] shrink-0 text-text-muted" strokeWidth={2.75} />
        <input
          ref={inputRef}
          value={s.q}
          onChange={(e) => { s.setQ(e.target.value); setFocused(true); }}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { (e.target as HTMLInputElement).blur(); setFocused(false); }
            else s.moveKey(e, go);
          }}
          placeholder="Tìm đề, từ vựng…"
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
        />
        {s.q ? (
          <button onClick={() => { s.reset(); inputRef.current?.focus(); }} aria-label="Xoá" className="flex size-5 items-center justify-center rounded text-text-muted hover:text-text">
            <X className="size-4" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold text-text-muted">⌘K</span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[60vh] w-[420px] overflow-y-auto rounded-2xl border-[1.5px] border-border bg-surface p-2 shadow-lg">
          <SearchResultsPanel q={s.q} loading={s.loading} results={s.results} flat={s.flat} active={s.active} setActive={s.setActive} onSelect={go} />
        </div>
      )}
    </div>
  );
}
