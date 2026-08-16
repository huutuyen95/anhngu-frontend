"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Lock, ChevronLeft, ChevronDown, AlertTriangle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getMyClassrooms, getClassroomRoadmap } from "@/lib/api/classrooms";
import type { MyClassroom, Roadmap, RoadmapSession } from "@/lib/types/classroom";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/features/classes/content-card";

export default function ClassDetailPage() {
  return (
    <Suspense fallback={<RoadmapSkeleton />}>
      <ClassDetailInner />
    </Suspense>
  );
}

function ClassDetailInner() {
  const router = useRouter();
  const params = useParams<{ classId: string }>();
  const searchParams = useSearchParams();
  const classId = Number(params.classId);

  const [classes, setClasses] = useState<MyClassroom[] | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionParam = Number(searchParams.get("session")) || null;

  // Danh sách lớp (để làm breadcrumb + cụm đổi lớp).
  useEffect(() => {
    let cancelled = false;
    getMyClassrooms()
      .then((r) => !cancelled && setClasses(r.data))
      .catch(() => !cancelled && setClasses([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRoadmap = useCallback(() => {
    setError(null);
    return getClassroomRoadmap(classId)
      .then(setRoadmap)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được lộ trình lớp."));
  }, [classId]);

  // Tải lộ trình khi đổi lớp (route).
  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    getClassroomRoadmap(classId)
      .then((r) => !cancelled && setRoadmap(r))
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Không tải được lộ trình lớp.");
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  // Quay lại tab (làm bài xong) → refetch để thẻ đổi trạng thái.
  useEffect(() => {
    function onFocus() {
      if (classId && document.visibilityState === "visible") loadRoadmap();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [classId, loadRoadmap]);

  const sessions = useMemo(() => roadmap?.sessions ?? [], [roadmap]);
  const activeSession = useMemo<RoadmapSession | null>(() => {
    if (sessions.length === 0) return null;
    const fromUrl = sessions.find((s) => s.id === sessionParam && !s.locked);
    if (fromUrl) return fromUrl;
    const openNotDone = sessions.find((s) => !s.locked && s.done < s.total);
    if (openNotDone) return openNotDone;
    const lastOpen = [...sessions].reverse().find((s) => !s.locked);
    return lastOpen ?? sessions[0];
  }, [sessions, sessionParam]);

  const setSessionQuery = useCallback(
    (id: number | null) => {
      const q = id === null ? "" : `?session=${id}`;
      router.replace(`/classes/${classId}${q}`);
    },
    [router, classId],
  );

  function selectSession(s: RoadmapSession) {
    if (s.locked) return;
    setSessionQuery(s.id);
  }

  // ── Render ──
  // Chỉ dùng roadmap khi đúng lớp đang xem (tránh nháy dữ liệu lớp cũ khi đổi lớp).
  const ready = roadmap && roadmap.classroom.id === classId;

  if (error && !ready) {
    return (
      <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-6 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => loadRoadmap()} className="btn btn-primary">
            Thử lại
          </button>
          <Link href="/classes" className="btn btn-secondary">
            Về danh sách lớp
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) return <RoadmapSkeleton />;

  const { classroom, stats } = roadmap;
  const ended = classroom.status === "ended";
  const hasMany = (classes?.length ?? 0) >= 2;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb chỉ hiện khi em có nhiều lớp */}
      {hasMany && (
        <Link
          href="/classes"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700 hover:text-accent-800"
        >
          <ChevronLeft className="size-4" strokeWidth={2.75} />
          Tất cả lớp của em · {classes!.length} lớp
        </Link>
      )}

      {ended && (
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-accent-100 px-4 py-3 text-sm font-semibold text-accent-800">
          <AlertTriangle className="size-4 shrink-0" strokeWidth={2.75} />
          Lớp đã kết thúc, em vẫn xem lại được.
        </div>
      )}

      {/* Tiêu đề */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-accent-700">
            {classroom.code}
          </span>
          <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-neutral-600">Lớp của em</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[clamp(30px,5vw,46px)] font-bold leading-tight text-text">
            {classroom.name}
          </h1>
          {/* Nhiều lớp → cụm đổi lớp (pill ≤3, dropdown ≥4). KHÔNG dùng <select>. */}
          {hasMany && <ClassSwitcher classes={classes!} currentId={classId} />}
        </div>
        {classroom.description && (
          <p className="mt-2 max-w-[640px] text-base text-neutral-700">{classroom.description}</p>
        )}
      </div>

      {/* 4 ô chỉ số */}
      <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        <StatTile accent label="Tiến độ của em" value={`${stats.my_progress_pct}%`} sub={`${stats.done_count}/${stats.total_count} nội dung`} />
        <StatTile label="Nhiệm vụ đã xong" value={`${stats.done_count}`} sub={`trên ${stats.total_count} nội dung`} />
        <StatTile
          label="Điểm trung bình"
          value={stats.my_avg_score !== null ? String(stats.my_avg_score) : "—"}
          sub={stats.class_avg_score !== null ? `Lớp: ${stats.class_avg_score}` : "Chưa có điểm"}
        />
        <StatTile label="Buổi đi học" value={`${stats.attended_sessions}`} sub={`trên ${stats.total_sessions} buổi`} />
      </div>

      {/* Mobile: chọn buổi bằng dải pill cuộn ngang (KHÔNG dùng select) */}
      {sessions.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 lg:hidden">
          <div className="flex gap-2 pb-1">
            {sessions.map((s) => {
              const active = activeSession?.id === s.id;
              const fullyDone = s.total > 0 && s.done >= s.total;
              return (
                <button
                  key={s.id}
                  disabled={s.locked}
                  onClick={() => selectSession(s)}
                  title={s.locked ? "Cô chưa mở buổi này" : undefined}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                    s.locked
                      ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
                      : active
                        ? "bg-accent text-bg"
                        : "border-[1.5px] border-divider bg-neutral-100 text-text-secondary",
                  )}
                >
                  {s.locked ? <Lock className="size-3.5" strokeWidth={2.75} /> : fullyDone ? <Check className="size-3.5" strokeWidth={2.75} /> : null}
                  Buổi {s.order + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lưới 2 cột */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Rail buổi (ẩn trên mobile) */}
        <aside className="hidden rounded-[var(--radius-lg)] bg-neutral-100 p-6 lg:block">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-neutral-600">Các buổi</p>
          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-600">Cô chưa mở buổi học nào.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sessions.map((s) => (
                <SessionRow key={s.id} session={s} active={activeSession?.id === s.id} onSelect={() => selectSession(s)} />
              ))}
            </ul>
          )}
        </aside>

        {/* Cột nội dung */}
        <section className="min-w-0">
          {activeSession ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-bold text-text">Buổi {activeSession.order + 1}: {activeSession.title}</h2>
                <span className="rounded-full bg-accent-2-200 px-3 py-1 text-xs font-bold text-accent-2-900">
                  {activeSession.done}/{activeSession.total} đã xong
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {activeSession.total} nội dung · em xong {activeSession.done}
              </p>

              {activeSession.note && (
                <div className="mt-4 rounded-[var(--radius-lg)] bg-accent-2-200 px-4 py-3 text-[14.5px] leading-relaxed text-accent-2-900 [&_a]:font-semibold [&_a]:underline">
                  <TeacherNote text={activeSession.note} />
                </div>
              )}

              {activeSession.items.length === 0 ? (
                <p className="mt-5 rounded-[var(--radius-lg)] bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-600">
                  Buổi này cô chưa giao nội dung.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {activeSession.items.map((item) => (
                    <ContentCard key={item.id} item={item} classId={classId} ended={ended} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="rounded-[var(--radius-lg)] bg-neutral-100 px-4 py-8 text-center text-sm text-neutral-600">
              Cô chưa mở buổi học nào.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/** Cụm đổi lớp nhanh: ≤3 lớp = pill, ≥4 lớp = dropdown tự dựng (không phải <select>). */
function ClassSwitcher({ classes, currentId }: { classes: MyClassroom[]; currentId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(id: number) {
    setOpen(false);
    if (id !== currentId) router.push(`/classes/${id}`);
  }

  if (classes.length <= 3) {
    return (
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chọn lớp">
        {classes.map((c) => {
          const active = c.id === currentId;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={active}
              onClick={() => go(c.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-accent text-bg"
                  : "border-[1.5px] border-divider bg-neutral-100 text-text-secondary hover:border-accent-300",
              )}
            >
              {c.code}
              {c.status === "ended" && <span className="ml-1.5 opacity-80">· đã kết thúc</span>}
            </button>
          );
        })}
      </div>
    );
  }

  const current = classes.find((c) => c.id === currentId);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg"
      >
        Đổi lớp: {current?.code ?? "—"}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} strokeWidth={2.75} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-20 max-h-72 w-64 overflow-auto rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-1.5 shadow-md"
        >
          {classes.map((c) => {
            const active = c.id === currentId;
            return (
              <li key={c.id}>
                <button
                  role="option"
                  aria-selected={active}
                  onClick={() => go(c.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm transition-colors",
                    active ? "bg-accent-100 font-bold text-accent-800" : "hover:bg-neutral-200",
                  )}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{c.code}</span>{" "}
                    <span className="text-neutral-600">· {c.name}</span>
                  </span>
                  {c.status === "ended" ? (
                    <span className="shrink-0 text-[11px] text-neutral-500">đã kết thúc</span>
                  ) : active ? (
                    <Check className="size-4 shrink-0 text-accent" strokeWidth={2.75} />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SessionRow({ session, active, onSelect }: { session: RoadmapSession; active: boolean; onSelect: () => void }) {
  const fullyDone = session.total > 0 && session.done >= session.total;
  const base = "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors";

  if (session.locked) {
    return (
      <li>
        <span title="Cô chưa mở buổi này" aria-disabled className={cn(base, "cursor-not-allowed")}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-neutral-500">
            <Lock className="size-3.5" strokeWidth={2.75} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-neutral-400">Buổi {session.order + 1}: {session.title}</span>
            <span className="block text-[11px] text-neutral-400">Cô chưa mở buổi này</span>
          </span>
        </span>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(base, active ? "border-[1.5px] border-accent-300 bg-accent-100" : "hover:bg-neutral-200")}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
            fullyDone ? "bg-accent-2-500 text-neutral-100" : "bg-accent text-neutral-100",
          )}
        >
          {fullyDone ? <Check className="size-4" strokeWidth={3} /> : session.order + 1}
        </span>
        <span className="min-w-0">
          <span className={cn("block truncate text-sm font-semibold", active ? "text-accent-800" : "text-text")}>
            {session.title}
          </span>
          <span className="block text-[11px] text-neutral-600">xong {session.done}/{session.total}</span>
        </span>
      </button>
    </li>
  );
}

/** Ghi chú của cô: bọc link thành thẻ a mở tab mới. */
function TeacherNote({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-line">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border-[1.5px] px-4 py-4",
        accent ? "border-accent-2-300 bg-accent-2-200" : "border-divider bg-neutral-100",
      )}
    >
      <p className={cn("text-[11px] font-extrabold uppercase tracking-wide", accent ? "text-accent-2-900" : "text-neutral-600")}>
        {label}
      </p>
      <p className={cn("mt-1 font-display text-[34px] font-bold leading-none", accent ? "text-accent-2-900" : "text-text")}>
        {value}
      </p>
      <p className={cn("mt-1 text-[12.5px]", accent ? "text-accent-2-800" : "text-neutral-600")}>{sub}</p>
    </div>
  );
}

function RoadmapSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-200" />
      <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden h-72 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200 lg:block" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
