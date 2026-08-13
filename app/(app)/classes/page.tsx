"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Lock, ChevronDown, School, AlertTriangle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getMyClassrooms, getClassroomRoadmap } from "@/lib/api/classrooms";
import type { MyClassroom, Roadmap, RoadmapSession } from "@/lib/types/classroom";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/features/classes/content-card";

export default function ClassesPage() {
  return (
    <Suspense fallback={<RoadmapSkeleton />}>
      <ClassesInner />
    </Suspense>
  );
}

function ClassesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<MyClassroom[] | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const classParam = Number(searchParams.get("class")) || null;
  const sessionParam = Number(searchParams.get("session")) || null;

  // Lớp đang chọn: theo URL nếu hợp lệ, không thì lớp đầu.
  const selectedClassId = useMemo(() => {
    if (!classes || classes.length === 0) return null;
    if (classParam && classes.some((c) => c.id === classParam)) return classParam;
    return classes[0].id;
  }, [classes, classParam]);

  // Tải danh sách lớp một lần.
  useEffect(() => {
    let cancelled = false;
    getMyClassrooms()
      .then((r) => !cancelled && setClasses(r.data))
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Không tải được lớp của em.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRoadmap = useCallback((id: number, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    return getClassroomRoadmap(id)
      .then(setRoadmap)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được lộ trình lớp."))
      .finally(() => setLoading(false));
  }, []);

  // Tải lộ trình khi đổi lớp.
  useEffect(() => {
    if (!selectedClassId) return;
    let cancelled = false;
    getClassroomRoadmap(selectedClassId)
      .then((r) => !cancelled && setRoadmap(r))
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Không tải được lộ trình lớp.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  // Quay lại tab (làm bài xong) → refetch để thẻ đổi trạng thái.
  useEffect(() => {
    function onFocus() {
      if (selectedClassId && document.visibilityState === "visible") loadRoadmap(selectedClassId, true);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [selectedClassId, loadRoadmap]);

  // Buổi đang chọn: theo URL nếu mở được, không thì buổi active gần nhất chưa xong.
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

  const setQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      router.replace(`/classes?${params.toString()}`);
    },
    [router, searchParams],
  );

  function selectSession(s: RoadmapSession) {
    if (s.locked) return;
    setQuery({ session: String(s.id) });
  }

  // ── Render ──
  if (loading && !roadmap) return <RoadmapSkeleton />;

  if (classes && classes.length === 0) {
    return (
      <EmptyBlock
        title="Em chưa ở lớp nào"
        desc="Em chưa được xếp vào lớp nào — liên hệ cô giáo nhé. Trong lúc chờ, em có thể tự luyện ở Thư viện."
        cta={{ label: "Sang Thư viện", href: "/library" }}
      />
    );
  }

  if (error && !roadmap) {
    return (
      <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-6 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
        <button
          onClick={() => selectedClassId && loadRoadmap(selectedClassId)}
          className="btn btn-primary mt-4"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!roadmap) return <RoadmapSkeleton />;

  const { classroom, stats } = roadmap;
  const ended = classroom.status === "ended";

  return (
    <div className="flex flex-col gap-6">
      {ended && (
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-accent-100 px-4 py-3 text-sm font-semibold text-accent-800">
          <AlertTriangle className="size-4 shrink-0" strokeWidth={2.75} />
          Lớp đã kết thúc, em vẫn xem lại được.
        </div>
      )}

      {/* Tiêu đề */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">Lớp của em</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[clamp(30px,5vw,46px)] font-bold leading-tight text-text">
            {classroom.name}
          </h1>
          {classes && classes.length > 1 && (
            <div className="relative">
              <select
                value={String(selectedClassId)}
                onChange={(e) => setQuery({ class: e.target.value, session: null })}
                className="h-10 cursor-pointer appearance-none rounded-full border-[1.5px] border-divider bg-neutral-100 pl-4 pr-9 text-sm font-semibold text-text outline-none focus:border-accent"
                aria-label="Chọn lớp"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            </div>
          )}
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

      {/* Mobile: chọn buổi bằng dropdown */}
      {sessions.length > 0 && (
        <div className="lg:hidden">
          <div className="relative">
            <select
              value={activeSession ? String(activeSession.id) : ""}
              onChange={(e) => {
                const s = sessions.find((x) => x.id === Number(e.target.value));
                if (s) selectSession(s);
              }}
              className="h-11 w-full cursor-pointer appearance-none rounded-full border-[1.5px] border-divider bg-neutral-100 pl-4 pr-9 text-sm font-semibold text-text outline-none focus:border-accent"
              aria-label="Chọn buổi"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} disabled={s.locked}>
                  Buổi {s.order + 1}: {s.title}{s.locked ? " (chưa mở)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
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

              {/* Ghi chú của cô (rỗng thì ẩn) */}
              {activeSession.note && (
                <div className="mt-4 rounded-[var(--radius-lg)] bg-accent-2-200 px-4 py-3 text-[14.5px] leading-relaxed text-accent-2-900 [&_a]:font-semibold [&_a]:underline">
                  <TeacherNote text={activeSession.note} />
                </div>
              )}

              {/* Thẻ nội dung */}
              {activeSession.items.length === 0 ? (
                <p className="mt-5 rounded-[var(--radius-lg)] bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-600">
                  Buổi này cô chưa giao nội dung.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {activeSession.items.map((item) => (
                    <ContentCard key={item.id} item={item} classId={selectedClassId!} ended={ended} />
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

function SessionRow({ session, active, onSelect }: { session: RoadmapSession; active: boolean; onSelect: () => void }) {
  const fullyDone = session.total > 0 && session.done >= session.total;
  const base = "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors";

  if (session.locked) {
    return (
      <li>
        <span
          title="Cô chưa mở buổi này"
          aria-disabled
          className={cn(base, "cursor-not-allowed")}
        >
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
        className={cn(
          base,
          active ? "border-[1.5px] border-accent-300 bg-accent-100" : "hover:bg-neutral-200",
        )}
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

function EmptyBlock({ title, desc, cta }: { title: string; desc: string; cta: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] bg-neutral-100 px-8 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">
        <School className="size-7" strokeWidth={2.75} />
      </span>
      <h1 className="font-display text-2xl font-bold text-text">{title}</h1>
      <p className="max-w-md text-sm text-neutral-700">{desc}</p>
      <Link href={cta.href} className="btn btn-primary">{cta.label}</Link>
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
