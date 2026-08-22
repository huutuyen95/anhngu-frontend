"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CLASS_STATUS_LABEL, type Classroom } from "@/lib/types/classroom";
import { cn } from "@/lib/utils";
import { useSlidingIndicator } from "@/lib/use-sliding-indicator";

export type ClassTab = "overview" | "assign" | "comments" | "report" | "students";

const TABS: { key: ClassTab; label: string }[] = [
  { key: "overview", label: "Tổng quan" },
  { key: "assign", label: "Giao bài" },
  { key: "comments", label: "Nhận xét" },
  { key: "report", label: "Báo cáo" },
  { key: "students", label: "Học viên" },
];

/** dd/mm/yyyy từ chuỗi ISO (yyyy-mm-dd). */
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function ClassHeader({
  classroom,
  tab,
  onTab,
}: {
  classroom: Classroom;
  tab: ClassTab;
  onTab: (t: ClassTab) => void;
}) {
  const { box, setRef } = useSlidingIndicator(tab);
  const start = fmtDate(classroom.starts_on);
  const end = fmtDate(classroom.ends_on);
  const dateRange = start && end ? `${start} → ${end}` : start ? `Từ ${start}` : null;
  const meta = [dateRange, CLASS_STATUS_LABEL[classroom.status]].filter(Boolean).join(" · ");

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
      {/* Nút quay lại — bo góc (rounded square) */}
      <Link
        href="/teacher/classes"
        aria-label="Về danh sách lớp"
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-border bg-surface text-text-secondary transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="size-5" />
      </Link>

      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-extrabold text-text">
          {classroom.name} · {classroom.students_count} học viên
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">{meta}</p>
      </div>

      {/* Tabs dạng pill, đặt trong khối nền mờ, căn phải */}
      <nav
        aria-label="Các mục của lớp"
        className="relative flex flex-wrap items-center gap-1 rounded-full bg-surface/55 p-1 backdrop-blur-sm"
      >
        {box && (
          <span aria-hidden
            className={cn(
              "pointer-events-none absolute top-0 rounded-full bg-surface shadow-[0_2px_10px_rgba(58,51,48,0.10)]",
              box.animate && "transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            )}
            style={{ transform: `translate(${box.left}px, ${box.top}px)`, width: box.width, height: box.height }}
          />
        )}
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              ref={setRef(t.key)}
              onClick={() => onTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active ? "text-brand" : "text-text-secondary hover:text-text"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
