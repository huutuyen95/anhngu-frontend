"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  LibraryBig,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listLibraryDecks } from "@/lib/api/decks";
import type { LibraryDeck } from "@/lib/types/deck";
import { cn } from "@/lib/utils";

type ProgressFilter = "all" | "new" | "learning" | "done";

const PROGRESS_FILTERS: { value: ProgressFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "new", label: "Chưa học" },
  { value: "learning", label: "Đang học" },
  { value: "done", label: "Đã hoàn thành" },
];

function progressState(deck: LibraryDeck): Exclude<ProgressFilter, "all"> {
  if (deck.cards_count > 0 && deck.learned_count >= deck.cards_count) return "done";
  if (deck.learned_count > 0) return "learning";
  return "new";
}

function deckProgress(deck: LibraryDeck): number {
  if (deck.cards_count === 0) return 0;
  return Math.min(100, Math.round((deck.learned_count / deck.cards_count) * 100));
}

function DeckCard({ deck }: { deck: LibraryDeck }) {
  const progress = deckProgress(deck);
  const state = progressState(deck);
  const classNames = deck.classrooms.map((classroom) => classroom.name);

  return (
    <li className="min-w-0">
      <Link
        href={`/library/vocab/${deck.id}`}
        className="group flex h-full min-h-56 flex-col rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-5 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-accent-300 hover:shadow-[var(--shadow-md)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-2-200 text-accent-2-800">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <span className="flex size-9 items-center justify-center rounded-full border border-divider text-neutral-600 transition-colors group-hover:border-accent-300 group-hover:bg-accent-100 group-hover:text-accent-800">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>

        <h2 className="mt-5 line-clamp-2 font-display text-xl font-bold leading-tight text-text">
          {deck.name}
        </h2>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {deck.category ? <span className="tag tag-accent">{deck.category.name}</span> : null}
          {classNames.length > 0 ? (
            classNames.slice(0, 2).map((name) => <span key={name} className="tag tag-accent-2">{name}</span>)
          ) : (
            <span className="tag tag-accent">Dùng chung</span>
          )}
          {classNames.length > 2 ? <span className="tag">+{classNames.length - 2} lớp</span> : null}
        </div>

        <div className="mt-auto pt-6">
          <div className="mb-2 flex items-end justify-between gap-3 text-sm">
            <span className="font-semibold text-neutral-700">
              {state === "done" ? "Đã hoàn thành" : state === "learning" ? "Đang học" : "Sẵn sàng học"}
            </span>
            <span className="shrink-0 font-bold tabular-nums text-text">
              {deck.learned_count}/{deck.cards_count} từ
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-neutral-200"
            role="progressbar"
            aria-label={`Tiến độ bộ từ ${deck.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                state === "done" ? "bg-accent-2-500" : "bg-accent-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Link>
    </li>
  );
}

export function VocabularyLibrarySkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse pb-10">
      <div className="mb-6 h-14 w-56 rounded-full bg-neutral-200" />
      <div className="mb-8 h-52 rounded-[var(--radius-lg)] bg-neutral-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-56 rounded-[var(--radius-lg)] bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}

export function VocabularyLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [decks, setDecks] = useState<LibraryDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const query = searchParams.get("q") ?? "";
  const requestedProgress = searchParams.get("progress");
  const progress: ProgressFilter = PROGRESS_FILTERS.some((item) => item.value === requestedProgress)
    ? requestedProgress as ProgressFilter
    : "all";
  const classroom = searchParams.get("class") ?? "all";
  const category = searchParams.get("category") ?? "all";

  const loadDecks = useCallback(() => {
    setLoading(true);
    setError(false);
    listLibraryDecks()
      .then((response) => setDecks(response.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    listLibraryDecks()
      .then((response) => {
        if (active) setDecks(response.data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateFilters = useCallback((values: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const classrooms = useMemo(() => {
    const options = new Map<number, string>();
    for (const deck of decks) {
      for (const item of deck.classrooms) options.set(item.id, item.name);
    }
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [decks]);

  const categories = useMemo(() => {
    const options = new Map<number, { name: string; order: number }>();
    for (const deck of decks) {
      if (deck.category) options.set(deck.category.id, { name: deck.category.name, order: deck.category.order ?? 0 });
    }
    return [...options.entries()].sort((a, b) => a[1].order - b[1].order || a[1].name.localeCompare(b[1].name, "vi"));
  }, [decks]);

  const shownDecks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return decks.filter((deck) => {
      if (normalizedQuery && !deck.name.toLocaleLowerCase("vi").includes(normalizedQuery)) return false;
      if (progress !== "all" && progressState(deck) !== progress) return false;
      if (category === "uncategorized" && deck.category !== null) return false;
      if (category !== "all" && category !== "uncategorized" && String(deck.category?.id) !== category) return false;
      if (classroom === "shared" && deck.classrooms.length > 0) return false;
      if (classroom !== "all" && classroom !== "shared" && !deck.classrooms.some((item) => String(item.id) === classroom)) return false;
      return true;
    });
  }, [category, classroom, decks, progress, query]);

  const hasFilters = Boolean(query || progress !== "all" || classroom !== "all" || category !== "all");
  const resetFilters = () => router.replace(pathname, { scroll: false });

  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <header className="mb-6 flex items-center gap-3 sm:mb-8">
        <Link href="/library" className="btn btn-secondary btn-icon" aria-label="Quay lại Thư viện">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-200 text-accent-800">
          <LibraryBig className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent-700">Thư viện</p>
          <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">Từ vựng</h1>
        </div>
      </header>

      <section className="card mb-7 p-4 sm:p-6" aria-label="Bộ lọc thư viện từ vựng">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-accent-800">
              <Sparkles className="size-4" aria-hidden />
              <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Học theo nhịp của em</p>
            </div>
            <p className="mt-1 font-display text-xl font-bold text-text">Chọn một bộ từ để bắt đầu</p>
            <p className="mt-1 text-sm text-neutral-600">Tìm kiếm hoặc lọc theo danh mục, tiến độ và lớp học.</p>
          </div>
          <label className="relative block w-full lg:max-w-md">
            <span className="sr-only">Tìm bộ từ</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
            <input
              className="input"
              style={{ paddingLeft: "3rem" }}
              type="search"
              value={query}
              onChange={(event) => updateFilters({ q: event.target.value || null })}
              placeholder="Tìm theo tên bộ từ…"
            />
          </label>
        </div>

        {categories.length > 0 ? (
          <div className="mt-6 border-t border-divider pt-5">
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-600">Danh mục</p>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo danh mục từ vựng">
              <FilterChip active={category === "all"} onClick={() => updateFilters({ category: "all" })}>Tất cả</FilterChip>
              {categories.map(([id, item]) => (
                <FilterChip key={id} active={category === String(id)} onClick={() => updateFilters({ category: String(id) })}>{item.name}</FilterChip>
              ))}
            </div>
          </div>
        ) : null}

        <div className={cn("border-t border-divider pt-5", categories.length > 0 ? "mt-4" : "mt-6")}>
          <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-600">Tiến độ</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo tiến độ">
            {PROGRESS_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={progress === item.value}
                onClick={() => updateFilters({ progress: item.value })}
                className={cn("btn h-10 shrink-0 px-4 text-sm", progress === item.value ? "btn-primary" : "btn-secondary")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {classrooms.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-600">Lớp học</p>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo lớp học">
              <FilterChip active={classroom === "all"} onClick={() => updateFilters({ class: "all" })}>Tất cả lớp</FilterChip>
              <FilterChip active={classroom === "shared"} onClick={() => updateFilters({ class: "shared" })}>Dùng chung</FilterChip>
              {classrooms.map(([id, name]) => (
                <FilterChip key={id} active={classroom === String(id)} onClick={() => updateFilters({ class: String(id) })}>{name}</FilterChip>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-neutral-700">
          {loading ? "Đang tải bộ từ…" : `${shownDecks.length} bộ từ`}
        </p>
        {hasFilters ? (
          <button type="button" onClick={resetFilters} className="btn btn-ghost h-9 px-3 text-sm">
            <RotateCcw className="size-4" aria-hidden />
            Xoá bộ lọc
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải danh sách bộ từ">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<LibraryBig className="size-7" />}
          title="Chưa tải được thư viện từ vựng"
          description="Kết nối đang gián đoạn. Em thử tải lại nhé."
          action={<Button onClick={loadDecks}>Thử lại</Button>}
          className="rounded-[var(--radius-lg)]"
        />
      ) : shownDecks.length === 0 ? (
        <EmptyState
          icon={<Search className="size-7" />}
          title={decks.length === 0 ? "Thư viện chưa có bộ từ nào" : "Không tìm thấy bộ từ phù hợp"}
          description={decks.length === 0 ? "Khi cô mở bộ từ mới, em sẽ thấy ở đây." : "Hãy đổi từ khoá hoặc xoá bớt bộ lọc."}
          action={hasFilters ? <Button onClick={resetFilters}>Xoá bộ lọc</Button> : undefined}
          className="rounded-[var(--radius-lg)]"
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shownDecks.map((deck) => <DeckCard key={deck.id} deck={deck} />)}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border-[1.5px] px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "border-accent-500 bg-accent-100 text-accent-800"
          : "border-divider bg-neutral-100 text-neutral-700 hover:border-accent-300 hover:text-accent-800",
      )}
    >
      {children}
    </button>
  );
}
