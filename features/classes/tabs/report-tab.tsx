"use client";

import { useEffect, useState } from "react";
import { Download, Users, CheckCircle2, Repeat, Clock } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/api";
import { getClassReport, reportExportUrl } from "@/lib/api/reports";
import type { ClassReport } from "@/lib/types/classroom";
import { StatCard } from "@/components/teacher/stat-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const PERIODS = [
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "90d", label: "90 ngày" },
];

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

export function ReportTab({ classId }: { classId: number }) {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<ClassReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getClassReport(classId, period)
      .then(setData)
      .catch(() => toast.error("Không tải được báo cáo."))
      .finally(() => setLoading(false));
  }, [classId, period]);

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />;
  if (!data) return null;

  const { stats, weekly_avg, score_buckets, by_student, pending_count } = data;
  const hasData = stats.attempts > 0;
  const maxWeek = Math.max(1, ...weekly_avg.map((w) => w.score));
  const maxBucket = Math.max(1, ...score_buckets.map((b) => b.count));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
                (period === p.key ? "bg-brand text-white" : "bg-surface-alt text-text-secondary hover:bg-brand-soft")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Download className="size-4" />}
          onClick={() =>
            downloadFile(reportExportUrl(classId, period), `bao-cao-lop-${classId}.xlsx`).catch(() =>
              toast.error("Không tải được file."),
            )
          }
        >
          Excel
        </Button>
      </div>

      {pending_count > 0 && (
        <p className="rounded-xl bg-warning-soft px-4 py-2 text-sm text-warning">
          {pending_count} bài chưa chấm — chưa tính vào điểm trung bình.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="size-5" />} iconTone="info" label="Học viên hoạt động" value={stats.active_students} />
        <StatCard icon={<CheckCircle2 className="size-5" />} iconTone="success" label="Bài hoàn thành" value={stats.completed} />
        <StatCard icon={<Repeat className="size-5" />} label="Lượt làm" value={stats.attempts} />
        <StatCard icon={<Clock className="size-5" />} iconTone="warning" label="Thời gian học" value={fmtDuration(stats.study_seconds)} />
      </div>

      {!hasData ? (
        <EmptyState title="Chưa đủ dữ liệu" description="Cần ít nhất 1 bài đã nộp để hiện biểu đồ." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Điểm TB theo tuần */}
          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
            <h3 className="mb-4 font-display text-base font-bold text-text">Điểm trung bình theo tuần</h3>
            <div className="flex h-40 items-end gap-2">
              {weekly_avg.map((w, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold text-text">{w.score || ""}</span>
                  <div
                    className="w-full rounded-t-md bg-brand transition-all"
                    style={{ height: `${(w.score / maxWeek) * 100}%`, minHeight: w.score > 0 ? 4 : 0 }}
                    title={`${w.week}: ${w.score}`}
                  />
                  <span className="text-[10px] text-text-muted">{w.week}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Phổ điểm */}
          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
            <h3 className="mb-4 font-display text-base font-bold text-text">Phổ điểm</h3>
            <div className="flex flex-col gap-2.5">
              {score_buckets.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-12 shrink-0 text-right text-xs text-text-muted">{b.range}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface-alt">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                  </div>
                  <span className="w-6 text-xs font-semibold text-text">{b.count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Bảng báo cáo học viên */}
      <section className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-display text-base font-bold text-text">Báo cáo học viên</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Học viên</th>
                <th className="px-3 py-2.5 text-left font-semibold">% Hoàn thành</th>
                <th className="px-3 py-2.5 text-left font-semibold">Lượt</th>
                <th className="px-3 py-2.5 text-left font-semibold">Bài &lt;60%</th>
                <th className="px-3 py-2.5 text-left font-semibold">Buổi đi học</th>
                <th className="px-3 py-2.5 text-left font-semibold">Tuần trước</th>
              </tr>
            </thead>
            <tbody>
              {by_student.map((s) => (
                <tr key={s.user.id} className="border-t border-border hover:bg-surface-alt">
                  <td className="px-4 py-2.5 font-medium text-text">{s.user.name}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-alt">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${s.completion_pct}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{s.completion_pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.attempts}</td>
                  <td className="px-3 py-2.5">
                    <span className={s.low_score_count > 0 ? "font-semibold text-danger" : "text-text-muted"}>
                      {s.low_score_count}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.attended}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.last_week_score || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
