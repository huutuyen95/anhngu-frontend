"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Star,
  PenLine,
  CalendarPlus,
  ClipboardCheck,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { getOverview, remindClass } from "@/lib/api/class-detail";
import type { ClassOverview } from "@/lib/types/classroom";
import type { ClassTab } from "@/features/classes/class-header";
import { StatCard } from "@/components/teacher/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export function OverviewTab({
  classId,
  onGoAssign,
  onGoTab,
}: {
  classId: number;
  onGoAssign: (sessionId: number) => void;
  onGoTab: (t: ClassTab) => void;
}) {
  const [data, setData] = useState<ClassOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverview(classId)
      .then(setData)
      .catch(() => toast.error("Không tải được tổng quan lớp."))
      .finally(() => setLoading(false));
  }, [classId]);

  async function remind() {
    const { reminded } = await remindClass(classId);
    toast.success(`Đã gửi nhắc cho ${reminded} học viên.`);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-alt" />
        ))}
      </div>
    );
  }
  if (!data) return null;
  const { stats, sessions, at_risk } = data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<TrendingUp className="size-5" />} label="Tiến trình lớp" value={`${stats.progress_pct}%`} />
        <StatCard icon={<Users className="size-5" />} iconTone="info" label="Học viên hoạt động" value={`${stats.active_students}/${stats.total_students}`} />
        <StatCard icon={<Star className="size-5" />} iconTone="success" label="Điểm trung bình" value={stats.avg_score || "—"} />
        <StatCard icon={<PenLine className="size-5" />} iconTone="warning" label="Bài chờ chấm" value={stats.pending_review} hint={stats.pending_review > 0 ? "Cần chấm" : "Đã chấm hết"} hintTone={stats.pending_review > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Buổi học */}
        <section className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-text">Buổi học gần đây</h2>
            <button onClick={() => onGoTab("assign")} className="text-sm font-medium text-brand hover:underline">
              Quản lý giao bài →
            </button>
          </div>
          {sessions.length === 0 ? (
            <EmptyState
              icon={<CalendarPlus className="size-7" />}
              title="Chưa có buổi học"
              description="Tạo buổi đầu tiên ở tab Giao bài để bắt đầu giao nội dung."
              action={<Button size="sm" onClick={() => onGoTab("assign")}>Tới Giao bài</Button>}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => onGoAssign(s.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-alt"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-display text-sm font-bold text-brand">
                      {s.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-text">{s.title}</p>
                        {!s.is_visible && <StatusBadge tone="neutral">Ẩn</StatusBadge>}
                      </div>
                      <p className="text-xs text-text-muted">
                        {s.held_on ?? "chưa mở"} · {s.items_count} nội dung · {s.done}/{s.total} hoàn thành
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${s.progress_pct}%` }} />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          {/* Học viên cần chú ý */}
          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-text">Học viên cần chú ý</h2>
              <button onClick={() => onGoTab("report")} className="text-sm font-medium text-brand hover:underline">
                Báo cáo →
              </button>
            </div>
            {at_risk.length === 0 ? (
              <p className="text-sm text-text-secondary">Cả lớp đang theo kịp — tuyệt vời! 🎉</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {at_risk.map((r) => (
                    <li key={r.user.id} className="flex items-start gap-2 rounded-xl bg-surface-alt p-2.5">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-text">{r.user.name}</p>
                        <p className="text-xs text-text-muted">{r.reason}</p>
                      </div>
                      <StatusBadge tone={r.tag === "at_risk" ? "danger" : "warning"}>
                        {r.tag === "at_risk" ? "Nguy cơ" : r.tag === "low_score" ? "Điểm thấp" : "Ít hoạt động"}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" fullWidth className="mt-3" onClick={remind}>
                  Nhắc {at_risk.length} học viên này làm bài
                </Button>
              </>
            )}
          </section>

          {/* Hành động nhanh */}
          <section className="rounded-2xl border-[1.5px] border-accent/40 bg-accent-soft p-5">
            <h2 className="mb-3 font-display text-lg font-bold text-text">Hành động nhanh</h2>
            <div className="flex flex-col gap-2">
              <Button fullWidth iconLeft={<PenLine className="size-4" />} onClick={() => onGoTab("assign")}>
                Giao bài cho lớp
              </Button>
              <Button variant="outline" fullWidth iconLeft={<ClipboardCheck className="size-4" />} onClick={() => onGoTab("comments")}>
                Điểm danh & nhận xét
              </Button>
              <Button variant="outline" fullWidth iconLeft={<UserPlus className="size-4" />} onClick={() => onGoTab("students")}>
                Thêm học viên vào lớp
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
