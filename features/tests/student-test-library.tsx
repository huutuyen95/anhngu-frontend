"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { listStudentTests, startAttempt } from "@/lib/api/tests";
import { testRoutes, type TestRoutes } from "@/features/tests/routes";
import {
  BUCKET_LABEL,
  SKILL_LABEL,
  type Skill,
  type StudentTest,
  type StudentTestListResponse,
  type TestBucket,
} from "@/lib/types/test";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
   Thư viện của em → Đề thi. Dữ liệu lấy từ `GET /tests` (khu học viên).
   Bộ lọc/sắp xếp/phân trang lưu trên URL query để share link + back/forward chạy đúng.
   ──────────────────────────────────────────────────────────────────────────── */

const SKILL_COLOR: Record<Skill, { fg: string; bg: string }> = {
  reading: { fg: "#D65F27", bg: "#FDEBDD" },
  listening: { fg: "#2380A8", bg: "#E4F5FD" },
  writing: { fg: "#8A6A3A", bg: "#F5EFDF" },
  speaking: { fg: "#8A5BB0", bg: "#F1E6FA" },
  mixed: { fg: "#6B4FB8", bg: "#EFE7FD" },
};

const SKILL_FILTERS: (Skill | "")[] = [
  "",
  "listening",
  "reading",
  "speaking",
  "writing",
  "mixed",
];

const BUCKETS: TestBucket[] = ["todo", "doing", "done", "grading"];
const BUCKET_COLOR: Record<TestBucket, string> = {
  todo: "#8A8073",
  doing: "#D65F27",
  done: "#5E8418",
  grading: "#B8860B",
};
const BUCKET_CTA: Record<TestBucket, string> = {
  todo: "Làm bài",
  doing: "Tiếp tục",
  done: "Làm lại",
  grading: "Xem bài",
};

const BTN_GHOST =
  "inline-flex h-[42px] items-center gap-2 rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold text-text transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:text-text-muted";
const BTN_PRIMARY =
  "inline-flex h-[42px] items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none disabled:opacity-60";

/** Trạng thái + nhãn nút của một đề, suy từ `attempt`. */
function readStatus(test: StudentTest) {
  const bucket: TestBucket = test.attempt?.bucket ?? "todo";
  let label: string = BUCKET_LABEL[bucket];

  if (bucket === "doing" && test.attempt) {
    const { answered_count, question_count } = test.attempt;
    if (answered_count !== null && question_count !== null) {
      label = `Đang làm · câu ${answered_count}/${question_count}`;
    }
  }
  if (bucket === "done" && test.attempt?.best_score !== null && test.attempt) {
    label = `Đã làm · ${test.attempt.best_score}/${test.total_score}`;
  }

  return {
    bucket,
    label,
    color: BUCKET_COLOR[bucket],
    cta: BUCKET_CTA[bucket],
  };
}

/**
 * Danh sách đề tự luyện. `basePath` là root của luồng làm bài (thư viện hoặc lớp học)
 * — mọi link/điều hướng nội bộ dựng từ đó, không hardcode "/library".
 *
 * Hàng hub (Đề thi / Từ vựng / Tài liệu) KHÔNG render ở đây: nó đã có ở trang
 * `/library` phía ngoài, lặp lại lần nữa trong trang con là thừa.
 */
export function StudentTestLibrary({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routes = useMemo(() => testRoutes(basePath), [basePath]);

  // Đọc ra biến nguyên trị → dùng làm deps ổn định, tránh loop gọi API.
  const spString = searchParams.toString();
  const q = searchParams.get("q") ?? "";
  const skill = searchParams.get("skill") ?? "";
  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [res, setRes] = useState<{
    key: string;
    data?: StudentTestListResponse;
    error?: string;
  } | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [startingId, setStartingId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const key = `${q}|${skill}|${status}|${sort}|${page}`;

  useEffect(() => {
    let alive = true;
    listStudentTests({ q, skill, status, sort, page })
      .then((data) => alive && setRes({ key, data }))
      .catch((err) => {
        if (!alive) return;
        setRes({
          key,
          error:
            err instanceof ApiError
              ? err.message
              : "Không tải được danh sách đề.",
        });
      });
    return () => {
      alive = false;
    };
  }, [key, q, skill, status, sort, page]);

  // Kết quả đang giữ thuộc bộ lọc cũ ⇒ vẫn đang tải bộ lọc mới.
  const loading = res?.key !== key;
  const data = res?.key === key ? res.data : undefined;
  const error = res?.key === key ? res.error : undefined;
  const meta = data?.meta;
  const tests = data?.data ?? [];

  const setParams = useCallback(
    (patch: Record<string, string | null>, keepPage = false) => {
      const next = new URLSearchParams(spString);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!keepPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${routes.list}?${qs}` : routes.list, {
        scroll: false,
      });
    },
    [spString, router, routes],
  );

  // Ô tìm kiếm gõ tới đâu lọc tới đó (debounce), nhưng URL mới là nguồn sự thật.
  const [search, setSearch] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    // URL đổi từ ngoài (back/forward, xoá lọc) → kéo ô tìm kiếm theo.
    setSyncedQ(q);
    setSearch(q);
  }
  useEffect(() => {
    if (search.trim() === q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [search, q, setParams]);

  const activeBuckets = status ? (status.split(",") as TestBucket[]) : [];

  function toggleBucket(b: TestBucket) {
    const next = activeBuckets.includes(b)
      ? activeBuckets.filter((x) => x !== b)
      : [...activeBuckets, b];
    setParams({ status: next.join(",") || null });
  }

  function clearAll() {
    setSearch("");
    router.replace(routes.list, { scroll: false });
  }

  /** todo/done → tạo lượt mới rồi vào màn làm bài. */
  async function handleStart(test: StudentTest) {
    setStartingId(test.id);
    setStartError(null);
    try {
      const attempt = await startAttempt(test.id);
      router.push(
        routes.attempt(test.id, attempt.attempt_id, attempt.deadline),
      );
    } catch (err) {
      setStartError(
        err instanceof ApiError ? err.message : "Không bắt đầu được bài làm.",
      );
      setStartingId(null);
    }
  }

  const hasFilter = q !== "" || skill !== "" || activeBuckets.length > 0;

  return (
    <div className="flex flex-col gap-7">
      {/* ── Hero ── */}
      <section className="flex flex-wrap items-end gap-6">
        <div className="max-w-[560px]">
          <p className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-brand-bold">
            Tự luyện
          </p>
          <h1 className="mt-2 font-display text-[36px] font-bold leading-[1.15] text-text">
            Thư viện của em
          </h1>
          <p className="mt-2 text-sm leading-[1.55] text-text-secondary">
            Tất cả đề thi, bộ từ vựng và tài liệu cô Uyên mở cho lớp em. Làm bao
            nhiêu lần cũng được — điểm tự luyện không tính vào bảng điểm lớp.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {/* /reports chưa có page — để "Sắp có" thay vì điều hướng ra 404. */}
          <button type="button" disabled title="Sắp có" className={BTN_GHOST}>
            Lịch sử làm bài
          </button>
          <button
            type="button"
            disabled={!tests.length || startingId !== null}
            onClick={() => tests[0] && handleStart(tests[0])}
            className={BTN_PRIMARY}
          >
            Luyện nhanh
          </button>
        </div>
      </section>

      {/* ── Sidebar lọc + danh sách ── */}
      <section className="grid items-start gap-7 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="rounded-[20px] border-[1.5px] border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-text">
              Bộ lọc
            </h2>
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-[11.5px] font-bold text-brand-bold hover:underline"
            >
              Xoá hết
            </button>
          </div>

          <label className="mb-[22px] mt-3 flex h-10 items-center gap-2 rounded-full border-[1.5px] border-border bg-surface-alt px-4">
            <span aria-hidden className="text-xs text-text-muted">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đề…"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold text-text outline-none placeholder:font-medium placeholder:text-text-muted"
            />
          </label>

          <Kicker>Kỹ năng</Kicker>
          <div className="mb-[22px] mt-2.5 flex flex-wrap gap-[7px]">
            {SKILL_FILTERS.map((s) => {
              const on = skill === s;
              return (
                <button
                  key={s || "all"}
                  type="button"
                  onClick={() => setParams({ skill: s || null })}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border-[1.5px] px-[13px] py-[7px] text-xs font-bold transition-colors",
                    on
                      ? "border-[#DCEBBC] bg-[#F1F8DE] text-[#5E8418]"
                      : "border-border bg-surface text-text-secondary hover:border-border-strong",
                  )}
                >
                  {s ? SKILL_LABEL[s] : "Tất cả"}
                </button>
              );
            })}
          </div>

          <Kicker>Trạng thái</Kicker>
          <div className="mt-2.5 flex flex-col gap-3">
            {BUCKETS.map((b) => {
              const on = activeBuckets.includes(b);
              return (
                <label
                  key={b}
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleBucket(b)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      // rounded-[6px]: thang radius của repo bị override (--radius 14px)
                      // nên rounded-md sẽ ra ~12px, gần thành hình tròn trên ô 18px.
                      "flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] text-[11px] font-bold text-white transition-colors",
                      on
                        ? "border-brand bg-brand"
                        : "border-border-strong bg-surface",
                    )}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span className="text-[13px] font-semibold text-text">
                    {BUCKET_LABEL[b]}
                  </span>
                  <span className="ml-auto text-[11.5px] font-semibold text-text-secondary">
                    {meta ? meta.status_counts[b] : "–"}
                  </span>
                </label>
              );
            })}
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="font-display text-lg font-bold text-text">
              Đề thi tự luyện
            </h2>
            <p className="text-[12.5px] font-semibold text-text-secondary">
              {meta
                ? `${meta.total} đề · đang xem ${tests.length}`
                : "Đang tải…"}
            </p>
            <div className="ml-auto flex items-center gap-2.5">
              <Select
                value={sort}
                onChange={(e) => setParams({ sort: e.target.value })}
                aria-label="Sắp xếp"
                className="h-9 pl-4 pr-8 text-[12.5px] font-bold"
              >
                <option value="newest">Mới nhất</option>
                <option value="popular">Nhiều lượt làm</option>
                <option value="name">Tên A → Z</option>
              </Select>
              <div className="flex items-center gap-1 rounded-full bg-[#F5EFDF] p-1">
                <ViewButton
                  active={view === "grid"}
                  onClick={() => setView("grid")}
                  label="Xem dạng lưới"
                  icon="▦"
                />
                <ViewButton
                  active={view === "list"}
                  onClick={() => setView("list")}
                  label="Xem dạng danh sách"
                  icon="☰"
                />
              </div>
            </div>
          </div>

          {hasFilter && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] font-semibold text-text-secondary">
                Đang lọc:
              </span>
              {skill && (
                <FilterChip
                  label={SKILL_LABEL[skill as Skill]}
                  fg={SKILL_COLOR[skill as Skill].fg}
                  bg={SKILL_COLOR[skill as Skill].bg}
                  onClear={() => setParams({ skill: null })}
                />
              )}
              {activeBuckets.map((b) => (
                <FilterChip
                  key={b}
                  label={BUCKET_LABEL[b]}
                  fg="#5E8418"
                  bg="#F1F8DE"
                  onClear={() => toggleBucket(b)}
                />
              ))}
              {q && (
                <FilterChip
                  label={`“${q}”`}
                  fg="#D65F27"
                  bg="#FDEBDD"
                  onClear={() => {
                    setSearch("");
                    setParams({ q: null });
                  }}
                />
              )}
            </div>
          )}

          {startError && (
            <p className="mt-3.5 rounded-2xl border-[1.5px] border-[#F0B5A9] bg-[#FDE7E2] px-4 py-3 text-[12.5px] font-semibold text-[#C1442F]">
              {startError}
            </p>
          )}

          {error ? (
            <div className="mt-3.5 rounded-[20px] border-[1.5px] border-[#F0B5A9] bg-[#FDE7E2] p-6 text-center">
              <p className="text-sm font-bold text-[#C1442F]">{error}</p>
              <button
                type="button"
                onClick={() => setRes(null)}
                className="mt-3 rounded-full bg-surface px-4 py-2 text-[12.5px] font-bold text-text"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "mt-3.5 grid gap-4",
                  view === "grid"
                    ? "md:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1",
                )}
              >
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TestCardSkeleton key={i} />
                    ))
                  : tests.map((test) => (
                      <TestCard
                        key={test.id}
                        test={test}
                        routes={routes}
                        starting={startingId === test.id}
                        onStart={handleStart}
                      />
                    ))}
              </div>

              {!loading && tests.length === 0 && (
                <div className="mt-3.5 flex flex-col items-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-border bg-surface p-10 text-center">
                  <span className="text-2xl" aria-hidden>
                    🔍
                  </span>
                  <p className="font-display text-base font-bold text-text">
                    {hasFilter
                      ? "Không có đề nào khớp bộ lọc"
                      : "Chưa có đề nào trong thư viện"}
                  </p>
                  <p className="text-[12.5px] text-text-secondary">
                    {hasFilter
                      ? "Em thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác nhé."
                      : "Khi cô mở đề cho lớp, đề sẽ hiện ở đây."}
                  </p>
                  {hasFilter && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="mt-1 rounded-full bg-brand-soft px-4 py-2 text-[12.5px] font-bold text-brand-bold"
                    >
                      Xoá hết bộ lọc
                    </button>
                  )}
                </div>
              )}

              {meta && meta.last_page > 1 && (
                <Pagination
                  current={meta.current_page}
                  last={meta.last_page}
                  onGo={(p) => setParams({ page: String(p) }, true)}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Thành phần con ───────────────────────────────────────────────────────── */

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
      {children}
    </p>
  );
}

function TestCard({
  test,
  routes,
  starting,
  onStart,
}: {
  test: StudentTest;
  routes: TestRoutes;
  starting: boolean;
  onStart: (test: StudentTest) => void;
}) {
  const color = SKILL_COLOR[test.skill];
  const st = readStatus(test);
  const attempt = test.attempt;

  // Chỉ số 3: ưu tiên điểm trung bình, chưa có thì hiện số lượt làm.
  const third =
    test.avg_score !== null
      ? { value: String(test.avg_score), label: "Điểm TB" }
      : { value: String(test.attempts_total), label: "Lượt làm" };

  const cta =
    st.bucket === "doing" && attempt ? (
      <Link href={routes.attempt(test.id, attempt.id)} className={CTA_CLASS}>
        {st.cta}
      </Link>
    ) : st.bucket === "grading" && attempt ? (
      <Link href={routes.result(test.id, attempt.id)} className={CTA_CLASS}>
        {st.cta}
      </Link>
    ) : (
      <button
        type="button"
        disabled={starting}
        onClick={() => onStart(test)}
        className={cn(CTA_CLASS, "disabled:opacity-60")}
      >
        {starting ? "Đang mở…" : st.cta}
      </button>
    );

  return (
    <article className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-border bg-surface p-[18px]">
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
          style={{ color: color.fg, background: color.bg }}
        >
          {SKILL_LABEL[test.skill]}
        </span>
        {test.category && (
          <span className="truncate text-[11px] font-semibold text-text-secondary">
            {test.category.path}
          </span>
        )}
      </div>

      <div>
        <h3 className="font-display text-base font-bold leading-[1.28] text-text [text-wrap:pretty]">
          {test.title}
        </h3>
        {test.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-[1.5] text-text-secondary">
            {test.description}
          </p>
        )}
      </div>

      <div className="flex gap-3.5 border-y border-border py-[11px]">
        <Stat value={String(test.question_count)} label="Câu" />
        <Stat value={`${test.duration_minutes}′`} label="Thời gian" />
        <Stat value={third.value} label={third.label} />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-[9px]">
        <span className="flex min-w-[120px] flex-[1_1_auto] items-center gap-1.5">
          <span
            aria-hidden
            className="size-[7px] shrink-0 rounded-full"
            style={{ background: st.color }}
          />
          <span className="text-[11.5px] font-bold" style={{ color: st.color }}>
            {st.label}
          </span>
        </span>
        {/* Nhóm nút: luôn dính nhau và xuống dòng cùng nhau khi card hẹp. */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href={routes.detail(test.id)}
            className="flex h-9 items-center rounded-full border-[1.5px] border-border bg-surface px-3.5 text-xs font-bold text-text transition-colors hover:border-border-strong"
          >
            Xem trước
          </Link>
          {cta}
        </div>
      </div>
    </article>
  );
}

const CTA_CLASS =
  "flex h-9 items-center rounded-full bg-brand-soft px-3.5 text-xs font-bold text-brand-bold transition-colors hover:bg-[#FFE3CE]";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-[15px] font-bold leading-none text-text">
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.3px] text-text-secondary">
        {label}
      </p>
    </div>
  );
}

function TestCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-border bg-surface p-[18px]">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-8 w-full" />
      <div className="mt-auto flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="ml-auto h-9 w-40 rounded-full" />
      </div>
    </div>
  );
}

function FilterChip({
  label,
  fg,
  bg,
  onClear,
}: {
  label: string;
  fg: string;
  bg: string;
  onClear: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ color: fg, background: bg }}
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Bỏ lọc ${label}`}
        className="text-[13px] leading-none opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </span>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-sm font-bold transition-colors",
        active ? "bg-surface text-brand-bold" : "text-text-secondary",
      )}
    >
      {icon}
    </button>
  );
}

/** Dãy số trang rút gọn: luôn có trang đầu/cuối, quanh trang hiện tại 1 bước. */
function pageList(current: number, last: number): (number | "gap")[] {
  const out: (number | "gap")[] = [];
  for (let p = 1; p <= last; p++) {
    if (p === 1 || p === last || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== "gap") out.push("gap");
  }
  return out;
}

function Pagination({
  current,
  last,
  onGo,
}: {
  current: number;
  last: number;
  onGo: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Phân trang"
      className="mt-[26px] flex items-center justify-center gap-2"
    >
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => onGo(current - 1)}
        aria-label="Trang trước"
        className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-sm font-bold text-text transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:border-border"
      >
        ←
      </button>
      {pageList(current, last).map((p, i) =>
        p === "gap" ? (
          <span
            key={`gap-${i}`}
            className="px-1 text-[12.5px] font-bold text-text-muted"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onGo(p)}
            aria-current={p === current ? "page" : undefined}
            className={cn(
              "h-9 min-w-9 rounded-full px-3 text-[12.5px] font-bold transition-colors",
              p === current
                ? "bg-brand text-white"
                : "border-[1.5px] border-border bg-surface text-text-secondary hover:border-border-strong",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={current >= last}
        onClick={() => onGo(current + 1)}
        aria-label="Trang sau"
        className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-sm font-bold text-text transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:border-border"
      >
        →
      </button>
    </nav>
  );
}
