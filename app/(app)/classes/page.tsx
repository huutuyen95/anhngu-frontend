"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Users, CalendarClock, School, AlertTriangle, CircleCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getMyClassrooms } from "@/lib/api/classrooms";
import type { MyClassroom, ClassStatus } from "@/lib/types/classroom";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ClassStatus, string> = {
  active: "Đang học",
  upcoming: "Sắp bắt đầu",
  ended: "Đã kết thúc",
};

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<MyClassroom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyClassrooms()
      .then((r) => {
        if (cancelled) return;
        // 1 lớp → vào thẳng, không hiện picker.
        if (r.data.length === 1) {
          router.replace(`/classes/${r.data[0].id}`);
          return;
        }
        setClasses(r.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Không tải được lớp của em.");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-6 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
      </div>
    );
  }

  if (!classes) return <PickerSkeleton />;

  // 0 lớp → trạng thái rỗng.
  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] bg-neutral-100 px-8 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <School className="size-7" strokeWidth={2.75} />
        </span>
        <h1 className="font-display text-2xl font-bold text-text">Em chưa được thêm vào lớp nào</h1>
        <p className="max-w-md text-sm text-neutral-700">
          Em chưa được thêm vào lớp nào — nhắn cô Uyên nhé. Trong lúc chờ, em có thể tự luyện ở Thư viện.
        </p>
        <Link href="/library" className="btn btn-primary">Sang Thư viện</Link>
      </div>
    );
  }

  // ≥2 lớp → lưới thẻ chọn lớp.
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">Lớp của em</p>
        <h1 className="mt-1 font-display text-[clamp(28px,4.5vw,42px)] font-bold leading-tight text-text">
          Chọn lớp để vào học
        </h1>
        <p className="mt-2 text-base text-neutral-700">Em đang tham gia {classes.length} lớp. Chọn một lớp để xem lộ trình.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((c) => (
          <ClassCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

function ClassCard({ c }: { c: MyClassroom }) {
  const accent = c.status === "active"; // Lớp đang học = thẻ nền accent (nút phải màu trắng).
  const ended = c.status === "ended";

  return (
    <Link
      href={`/classes/${c.id}`}
      className={cn(
        "class-card flex flex-col gap-4 rounded-[var(--radius-lg)] border-[1.5px] p-5",
        accent
          ? "class-card--accent border-accent bg-accent text-bg"
          : ended
            ? "class-card--neutral class-card--ended border-divider bg-neutral-100 text-text opacity-95"
            : "class-card--neutral border-divider bg-neutral-100 text-text",
      )}
    >
      {/* Hàng đầu: mã lớp + trạng thái (luôn kèm CHỮ) */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "class-card__code rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide",
            accent ? "bg-bg/20 text-bg" : "bg-accent-100 text-accent-700",
          )}
        >
          {c.code}
        </span>
        <StatusPill status={c.status} onAccent={accent} />
      </div>

      {/* Tên lớp + cô + sĩ số */}
      <div>
        <h2 className={cn("font-display text-xl font-bold leading-snug", accent ? "text-bg" : "text-text")}>
          {c.name}
        </h2>
        <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]", accent ? "text-bg/85" : "text-neutral-600")}>
          {c.teacher_name && <span>Cô {c.teacher_name}</span>}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" strokeWidth={2.75} /> {c.students_count} bạn
          </span>
          {c.schedule_text && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" strokeWidth={2.75} /> {c.schedule_text}
            </span>
          )}
        </div>
      </div>

      {/* Tiến độ */}
      <div>
        <div className={cn("flex items-center justify-between text-xs font-semibold", accent ? "text-bg/90" : "text-neutral-600")}>
          <span>Tiến độ của em</span>
          <span>{c.progress_pct}% · {c.done_count}/{c.total_count}</span>
        </div>
        <div className={cn("mt-1.5 h-2 overflow-hidden rounded-full", accent ? "bg-bg/25" : "bg-neutral-200")}>
          <div
            className={cn("h-full rounded-full", accent ? "bg-bg" : "bg-accent")}
            style={{ width: `${Math.max(c.progress_pct, 2)}%` }}
          />
        </div>
      </div>

      {/* Việc cần làm + điểm TB */}
      <div className="flex flex-wrap items-center gap-2">
        {ended ? (
          <Badge onAccent={accent} tone="muted">Đã kết thúc</Badge>
        ) : c.due_soon_count > 0 ? (
          <Badge onAccent={accent} tone="warn">
            <AlertTriangle className="size-3.5" strokeWidth={2.75} /> {c.due_soon_count} việc sắp đến hạn
          </Badge>
        ) : c.todo_count > 0 ? (
          <Badge onAccent={accent} tone="todo">{c.todo_count} việc cần làm</Badge>
        ) : (
          <Badge onAccent={accent} tone="done">
            <CircleCheck className="size-3.5" strokeWidth={2.75} /> Đã xong hết
          </Badge>
        )}
        <Badge onAccent={accent} tone="score">
          {c.avg_score !== null ? `Điểm TB ${c.avg_score}` : "Chưa có điểm"}
        </Badge>
      </div>

      {/* CTA — trên nền accent BẮT BUỘC nút trắng (--color-bg), KHÔNG dùng btn-primary. */}
      <span
        className={cn("btn mt-auto w-full", accent ? "btn-secondary" : "btn-primary")}
        style={accent ? { background: "var(--color-bg)", borderColor: "var(--color-bg)", color: "var(--color-accent)" } : undefined}
      >
        {ended ? "Xem lại lớp" : "Vào lớp"}
        <ArrowRight className="class-card__arrow size-4" strokeWidth={2.75} />
      </span>
    </Link>
  );
}

function StatusPill({ status, onAccent }: { status: ClassStatus; onAccent: boolean }) {
  const label = STATUS_LABEL[status];
  if (onAccent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg/20 px-2.5 py-1 text-xs font-bold text-bg">
        <span className="size-1.5 rounded-full bg-bg" /> {label}
      </span>
    );
  }
  const tone =
    status === "active"
      ? "bg-accent-2-200 text-accent-2-900"
      : status === "upcoming"
        ? "bg-info-soft text-info"
        : "bg-neutral-200 text-neutral-600";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", tone)}>
      {label}
    </span>
  );
}

function Badge({
  children,
  tone,
  onAccent,
}: {
  children: React.ReactNode;
  tone: "warn" | "todo" | "done" | "muted" | "score";
  onAccent: boolean;
}) {
  if (onAccent) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg/15 px-2.5 py-1 text-xs font-semibold text-bg">
        {children}
      </span>
    );
  }
  const cls: Record<string, string> = {
    warn: "bg-accent-100 text-accent-800",
    todo: "bg-accent-2-200 text-accent-2-900",
    done: "bg-accent-2-200 text-accent-2-900",
    muted: "bg-neutral-200 text-neutral-600",
    score: "bg-neutral-200 text-neutral-700",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", cls[tone])}>
      {children}
    </span>
  );
}

function PickerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-72 animate-pulse rounded-lg bg-neutral-200" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}
