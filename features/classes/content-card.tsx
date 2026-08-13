"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RoadmapItem } from "@/lib/types/classroom";
import { itemCta, attemptsNote, typeMeta, statusChip } from "./roadmap-helpers";

/** Một thẻ nội dung trong buổi. Click thân thẻ = bấm CTA chính. */
export function ContentCard({ item, ended }: { item: RoadmapItem; ended?: boolean }) {
  const router = useRouter();
  const meta = typeMeta(item);
  const chip = statusChip(item);
  const cta0 = itemCta(item);
  const cta = ended && !cta0.disabled ? { ...cta0, label: "Xem lại" } : cta0;
  const note = attemptsNote(item);
  const Icon = meta.icon;

  const go = () => {
    if (cta.disabled || !cta.href) return;
    router.push(cta.href);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-4 transition-colors hover:border-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-row sm:items-center"
    >
      <span className={cn("flex size-[52px] shrink-0 items-center justify-center rounded-full", meta.iconWrap)}>
        <Icon className="size-6" strokeWidth={2.75} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700">
            {meta.chip}
          </span>
          {chip && <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", chip.cls)}>{chip.label}</span>}
          {item.is_overdue && (
            <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-bold text-danger">
              Quá hạn{dueDays(item.due_date)}
            </span>
          )}
          {item.status === "graded" && item.score !== null && (
            <span className="rounded-full bg-accent-2-200 px-2.5 py-0.5 text-[11px] font-bold text-accent-2-900">
              {formatScore(item.score)} điểm
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-display text-[18px] font-bold leading-snug text-text">{item.title}</h3>
        <p className="mt-0.5 text-[12.5px] text-neutral-600">{item.meta}</p>

        {item.progress_pct > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-[130px] overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full bg-accent" style={{ width: `${item.progress_pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-neutral-600">{item.progress_pct}%</span>
          </div>
        )}
        {note && <p className="mt-1 text-[11.5px] font-semibold text-neutral-500">{note}</p>}
      </div>

      {cta.disabled || !cta.href ? (
        <span className="btn btn-secondary shrink-0 cursor-not-allowed opacity-60 sm:w-auto" aria-disabled>
          {cta.label}
        </span>
      ) : (
        <Link
          href={cta.href}
          onClick={(e) => e.stopPropagation()}
          className="btn btn-primary h-[42px] shrink-0 max-sm:w-full"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function formatScore(v: number): string {
  return Number.isInteger(v) ? String(v) : Number(v.toFixed(1)).toString();
}

function dueDays(due: string | null): string {
  if (!due) return "";
  const days = Math.ceil((Date.now() - new Date(due).getTime()) / 86_400_000);
  return days > 0 ? ` ${days} ngày` : "";
}
