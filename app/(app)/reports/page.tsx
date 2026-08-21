"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Target, CheckCircle2, ClipboardList, Clock, TrendingUp, TrendingDown, Minus,
  Eye, BarChart3, AlertTriangle, type LucideIcon,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { getMyClassrooms } from "@/lib/api/classrooms";
import { getStudentReport } from "@/lib/api/report";
import type { MyClassroom } from "@/lib/types/classroom";
import type { ReportPeriod, ReportNote, StudentReport } from "@/lib/types/report";
import { PERIOD_LABEL } from "@/lib/types/report";
import { useAccessGuard } from "@/lib/access-guard";
import { cn } from "@/lib/utils";
import { MiniPlot, SkillChart, ActivityDonut, ACTIVITY_META, CHART_BLUE, CHART_AMBER } from "@/features/reports/charts";

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportsInner />
    </Suspense>
  );
}

function ReportsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { allowed, ready } = useAccessGuard((u) => u.role === "student", "/teacher");

  const [classes, setClasses] = useState<MyClassroom[] | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tab = params.get("tab") ?? "overview"; // "overview" | classId
  const classId = tab === "overview" ? null : Number(tab);

  useEffect(() => {
    getMyClassrooms().then((r) => setClasses(r.data)).catch(() => setClasses([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return getStudentReport({ scope: classId ? "class" : "overview", classroom_id: classId, period })
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được báo cáo."))
      .finally(() => setLoading(false));
  }, [classId, period]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  function setTab(t: string) {
    const p = new URLSearchParams(params.toString());
    if (t === "overview") p.delete("tab"); else p.set("tab", t);
    router.replace(`/reports${p.toString() ? `?${p}` : ""}`);
  }

  if (!ready) return <ReportSkeleton />;
  if (!allowed) return null; // teacher → đang redirect /teacher

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">Báo cáo học tập</p>
        <h1 className="mt-1 font-display text-[clamp(26px,4vw,38px)] font-bold leading-tight text-text">Tiến độ của em</h1>
      </div>

      {/* Tabs lớp */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2" role="tablist" aria-label="Chọn phạm vi báo cáo">
          <TabPill active={tab === "overview"} onClick={() => setTab("overview")}>Tổng quan</TabPill>
          {(classes ?? []).map((c) => (
            <TabPill key={c.id} active={tab === String(c.id)} onClick={() => setTab(String(c.id))}>{c.name}</TabPill>
          ))}
        </div>
      </div>

      {error && !report ? (
        <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">{error}</p>
          <button onClick={() => load()} className="btn btn-primary mt-4">Thử lại</button>
        </div>
      ) : loading && !report ? (
        <ReportSkeleton bare />
      ) : report ? (
        <ReportBody report={report} period={period} onPeriod={setPeriod} />
      ) : null}
    </div>
  );
}

function ReportBody({ report, period, onPeriod }: { report: StudentReport; period: ReportPeriod; onPeriod: (p: ReportPeriod) => void }) {
  const { stats, skills, class_progress, activity_mix, test_history, activity_7d } = report;

  return (
    <>
      {/* Khối 1 — 4 thẻ chỉ số */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-text">Chỉ số tổng hợp</h2>
        <PeriodFilter value={period} onChange={onPeriod} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} wrap="bg-accent-100 text-accent-700" label="Điểm trung bình" value={`${stats.avg_score}%`}
          plot={stats.weekly.score} color="var(--color-accent)" note={stats.notes.avg_score} sub="Không tính bài chờ chấm" />
        <StatCard icon={CheckCircle2} wrap="bg-accent-2-200 text-accent-2-800" label="Bài hoàn thành" value={String(stats.completed)}
          plot={stats.weekly.completed} color="var(--color-accent-2)" note={stats.notes.completed} />
        <StatCard icon={ClipboardList} wrap="bg-info-soft text-info" label="Lượt làm bài" value={String(stats.attempts)}
          plot={stats.weekly.attempts} color={CHART_BLUE} note={stats.notes.attempts} />
        <StatCard icon={Clock} wrap="bg-warning-soft text-warning" label="Thời gian học" value={formatDuration(stats.study_seconds)}
          plot={stats.weekly.minutes} color={CHART_AMBER} note={stats.notes.study} />
      </div>

      {/* Khối 2 — Phân tích kỹ năng */}
      <Panel title="Phân tích kỹ năng" hint="4 tuần gần nhất · mốc chuẩn 40 & 80">
        <SkillChart skills={skills} />
      </Panel>

      {/* Khối 3 — Tiến độ + Hoạt động */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Tiến độ các lớp học">
          {class_progress.length === 0 ? (
            <Empty>Chưa có lớp để thống kê.</Empty>
          ) : (
            <ul className="flex flex-col gap-4">
              {class_progress.map((c) => (
                <li key={c.classroom_id}>
                  <div className="flex items-center justify-between text-sm font-semibold text-text">
                    <span className="truncate">{c.name}</span>
                    <span className="text-neutral-600">{c.done}/{c.total} · {c.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(c.pct, 2)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Hoạt động của bạn">
          {activity_mix.every((m) => m.count === 0) ? (
            <Empty>Chưa có hoạt động nào.</Empty>
          ) : (
            <ActivityDonut data={activity_mix} />
          )}
        </Panel>
      </div>

      {/* Khối 4 — Lịch sử làm bài */}
      <Panel title="Lịch sử làm bài kiểm tra">
        {test_history.length === 0 ? (
          <Empty>Chưa có dữ liệu lịch sử làm bài.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-[11px] font-extrabold uppercase tracking-wide text-neutral-600">
                  <th className="py-2 pr-3">Tên bài</th>
                  <th className="py-2 pr-3">Điểm số</th>
                  <th className="py-2 text-right">Xem chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {test_history.map((t) => (
                  <tr key={t.attempt_id} className="border-b border-divider/60">
                    <td className="py-2.5 pr-3 font-semibold text-text">{t.test_name}</td>
                    <td className="py-2.5 pr-3">
                      {t.pending ? <span className="text-accent-800">Chờ chấm</span>
                        : <span className="font-bold text-accent-2-900">{t.score ?? "—"}</span>}
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/library/tests/${t.test_id}/result/${t.attempt_id}`} aria-label="Xem chi tiết"
                        className="inline-flex size-8 items-center justify-center rounded-lg border-[1.5px] border-divider text-neutral-600 hover:border-accent-300 hover:text-accent-700">
                        <Eye className="size-4" strokeWidth={2.5} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Khối 5 — Hoạt động 7 ngày */}
      <Panel title="Lịch sử hoạt động 7 ngày qua">
        {activity_7d.length === 0 ? (
          <Empty>Chưa có hoạt động trong 7 ngày qua.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-[11px] font-extrabold uppercase tracking-wide text-neutral-600">
                  <th className="py-2 pr-3">Hoạt động</th>
                  <th className="py-2 pr-3">Phân loại</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {activity_7d.map((a) => (
                  <tr key={a.id} className="border-b border-divider/60">
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-text">{a.name}</p>
                      <p className="text-xs text-neutral-500">{formatDate(a.at)}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full bg-accent-2-200 px-2.5 py-0.5 text-[11px] font-bold text-accent-2-900">
                        {ACTIVITY_META[a.category]?.label ?? a.category}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full bg-accent-2-600 px-2.5 py-0.5 text-[11px] font-bold text-bg">
                        {a.status === "done" ? "Hoàn thành" : "Đã xem"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <ActivityDetailLink category={a.category} targetId={a.target_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function ActivityDetailLink({ category, targetId }: { category: string; targetId: number | null }) {
  const href = targetId
    ? category === "vocab" ? `/library/vocab/${targetId}`
    : category === "test" || category === "speaking" ? `/library/tests/${targetId}`
    : category === "exercise" ? `/library/documents/${targetId}` : null
    : null;
  const cls = "inline-flex size-8 items-center justify-center rounded-lg border-[1.5px] border-divider text-neutral-600";
  if (!href) return <span className={cn(cls, "opacity-40")}><Eye className="size-4" strokeWidth={2.5} /></span>;
  return (
    <Link href={href} aria-label="Xem chi tiết" className={cn(cls, "hover:border-accent-300 hover:text-accent-700")}>
      <Eye className="size-4" strokeWidth={2.5} />
    </Link>
  );
}

// ── Thành phần con ──

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-accent text-bg" : "border-[1.5px] border-divider bg-neutral-100 text-text-secondary hover:border-accent-300")}>
      {children}
    </button>
  );
}

function PeriodFilter({ value, onChange }: { value: ReportPeriod; onChange: (p: ReportPeriod) => void }) {
  return (
    <div className="inline-flex rounded-full border-[1.5px] border-divider bg-neutral-100 p-1">
      {(Object.keys(PERIOD_LABEL) as ReportPeriod[]).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={cn("rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            value === p ? "bg-accent text-bg" : "text-neutral-600 hover:text-accent-700")}>
          {PERIOD_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, wrap, label, value, plot, color, note, sub }: {
  icon: LucideIcon; wrap: string; label: string; value: string; plot: number[]; color: string; note: ReportNote; sub?: string;
}) {
  const NoteIcon = note.dir === "up" ? TrendingUp : note.dir === "down" ? TrendingDown : Minus;
  const noteCls = note.dir === "up" ? "text-accent-2-800" : note.dir === "down" ? "text-danger" : "text-neutral-500";
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-4">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", wrap)}>
          <Icon className="size-5" strokeWidth={2.5} />
        </span>
        <span className="text-[13px] font-semibold text-neutral-600">{label}</span>
      </div>
      <p className="font-display text-[30px] font-bold leading-none text-text">{value}</p>
      <MiniPlot values={plot} color={color} />
      <p className={cn("inline-flex items-center gap-1 text-xs font-semibold", noteCls)}>
        <NoteIcon className="size-3.5" strokeWidth={2.75} /> {note.text}
      </p>
      {sub && <p className="-mt-1 text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-text">{title}</h2>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-neutral-200/60 px-4 py-8 text-center text-sm text-neutral-600">{children}</p>;
}

function ReportSkeleton({ bare }: { bare?: boolean } = {}) {
  return (
    <div className="flex flex-col gap-6">
      {!bare && <div className="h-10 w-56 animate-pulse rounded-lg bg-neutral-200" />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />)}
      </div>
      <div className="h-56 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
      </div>
    </div>
  );
}

// ── Helpers ──
function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  return `${h}h${m % 60 ? ` ${m % 60}p` : ""}`;
}
function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
