"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  School,
  PenLine,
  ClipboardList,
  TrendingUp,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { getDashboard } from "@/lib/api/dashboard";
import type { DashboardData } from "@/lib/types/classroom";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/teacher/stat-card";
import { CoverThumb } from "@/components/teacher/cover-thumb";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getDashboard()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-alt" />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-alt" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-surface-alt" />
          <div className="h-64 animate-pulse rounded-2xl bg-surface-alt" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-danger-soft p-6 text-center text-danger">
          Không tải được bảng điều khiển.
          <Button
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => location.reload()}
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { stats, classes, todos, activities } = data;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl font-bold text-text">
        Chào cô {user?.name} 👋
      </h1>
      <p className="mt-1 text-sm capitalize text-text-secondary">
        {today} · {stats.classes} lớp đang dạy · {stats.pending_review} bài chờ chấm
      </p>

      {/* 4 StatCard bấm được */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<School className="size-5" />}
          iconTone="brand"
          label="Lớp đang dạy"
          value={stats.classes}
          hint="Xem tất cả lớp"
          href="/teacher/classes"
        />
        <StatCard
          icon={<PenLine className="size-5" />}
          iconTone="warning"
          label="Bài chờ chấm"
          value={stats.pending_review}
          hint={stats.pending_review > 0 ? "Cần cô xử lý" : "Đã chấm hết"}
          hintTone={stats.pending_review > 0 ? "warning" : "success"}
          href="/teacher/grading"
        />
        <StatCard
          icon={<ClipboardList className="size-5" />}
          iconTone="info"
          label="Bài đang mở"
          value={stats.open_missions}
          hint="Xem kết quả"
          href="/teacher/results"
        />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          iconTone="success"
          label="Điểm TB tuần"
          value={stats.avg_score_week || "—"}
          hint={
            stats.delta === null
              ? "Chưa đủ dữ liệu"
              : `${stats.delta >= 0 ? "▲" : "▼"} ${Math.abs(stats.delta)} so với tuần trước`
          }
          hintTone={stats.delta === null ? "muted" : stats.delta >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Lớp của cô */}
        <section className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-text">Lớp của cô</h2>
            <Link href="/teacher/classes" className="text-sm font-medium text-brand hover:underline">
              Xem tất cả →
            </Link>
          </div>
          {classes.length === 0 ? (
            <EmptyState
              icon={<School className="size-7" />}
              title="Chưa có lớp học"
              description="Tạo lớp đầu tiên để bắt đầu giao bài cho học sinh."
              action={
                <ButtonLink size="sm" href="/teacher/classes/new">
                  Tạo lớp đầu tiên
                </ButtonLink>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/teacher/classes/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:bg-surface-alt"
                  >
                    <CoverThumb
                      cover={c.cover_url}
                      name={c.name}
                      className="size-11 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">{c.name}</p>
                      <p className="text-xs text-text-muted">
                        {c.students_count} học viên · TB {c.avg_score || "—"}
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${c.progress_pct}%` }}
                        />
                      </div>
                    </div>
                    {c.pending_review_count > 0 && (
                      <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
                        {c.pending_review_count} chờ chấm
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          {/* Cần cô xử lý */}
          <section className="rounded-2xl border-[1.5px] border-accent/40 bg-accent-soft p-5">
            <h2 className="mb-3 font-display text-lg font-bold text-text">Cần cô xử lý</h2>
            {todos.length === 0 ? (
              <p className="text-sm text-text-secondary">Không có việc nào cần xử lý gấp 🎉</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {todos.map((t, i) => (
                  <li key={i}>
                    <Link
                      href={t.href}
                      className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-white"
                    >
                      {t.text}
                      <ArrowRight className="size-4 text-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Hoạt động gần đây */}
          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
            <h2 className="mb-3 font-display text-lg font-bold text-text">Hoạt động gần đây</h2>
            {activities.length === 0 ? (
              <p className="text-sm text-text-muted">Chưa có hoạt động nào.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {activities.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CircleDot className="mt-0.5 size-3.5 shrink-0 text-brand" />
                    <span className="flex-1 text-text-secondary">{a.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
