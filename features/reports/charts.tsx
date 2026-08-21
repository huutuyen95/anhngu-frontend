"use client";

import type { ActivityType } from "@/lib/types/report";

// ── Màu biểu đồ (tập trung 1 chỗ): 2 token DS + 2 màu phụ cho đủ 4 nhánh ──
export const CHART_BLUE = "#2d7ff9";
export const CHART_AMBER = "#e0a94a";

export const SKILL_META = [
  { key: "listening", label: "Nghe", color: "var(--color-accent)" },
  { key: "reading", label: "Đọc", color: "var(--color-accent-2)" },
  { key: "writing", label: "Viết", color: CHART_BLUE },
  { key: "speaking", label: "Nói", color: CHART_AMBER },
] as const;

export const ACTIVITY_META: Record<ActivityType, { label: string; color: string }> = {
  exercise: { label: "Bài tập", color: "var(--color-accent-2)" },
  test: { label: "Đề kiểm tra", color: "var(--color-accent)" },
  vocab: { label: "Từ vựng", color: CHART_BLUE },
  speaking: { label: "Luyện nói", color: CHART_AMBER },
};

/** Mini-plot 4 mốc (đường + chấm) trong thẻ chỉ số. */
export function MiniPlot({ values, color }: { values: number[]; color: string }) {
  const w = 120, h = 36, pad = 4;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / Math.max(values.length - 1, 1);
    const y = h - pad - (v / max) * (h - 2 * pad);
    return { x, y };
  });
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />)}
    </svg>
  );
}

/** Biểu đồ đường 4 tuần cho 4 kỹ năng + 2 đường mốc 40/80 (thang 0–100). */
export function SkillChart({ skills }: { skills: Record<string, number[]> }) {
  const w = 340, h = 200, padL = 30, padR = 12, padT = 12, padB = 24;
  const weeks = 4;
  const x = (i: number) => padL + (i * (w - padL - padR)) / (weeks - 1);
  const y = (v: number) => padT + (1 - v / 100) * (h - padT - padB);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[200px] w-full min-w-[320px]" role="img" aria-label="Phân tích kỹ năng 4 tuần">
        {/* Lưới + mốc chuẩn 40, 80 */}
        {[0, 40, 80, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={w - padR} y2={y(v)} stroke="var(--color-divider)" strokeWidth={1}
              strokeDasharray={v === 40 || v === 80 ? "4 4" : undefined} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className="fill-[var(--color-neutral-500)] text-[9px]">{v}</text>
          </g>
        ))}
        {["T1", "T2", "T3", "T4"].map((t, i) => (
          <text key={t} x={x(i)} y={h - 8} textAnchor="middle" className="fill-[var(--color-neutral-500)] text-[9px]">{t}</text>
        ))}
        {SKILL_META.map((s) => {
          const series = skills[s.key] ?? [0, 0, 0, 0];
          const line = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.key}>
              <polyline points={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {series.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />)}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {SKILL_META.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Donut 4 loại hoạt động + tổng ở tâm. */
export function ActivityDonut({ data }: { data: { type: ActivityType; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 52, cx = 70, cy = 70, C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0">
        <svg viewBox="0 0 140 140" className="size-[140px] -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-neutral-200)" strokeWidth={16} />
          {total > 0 && data.map((d) => {
            const len = (d.count / total) * C;
            const seg = (
              <circle key={d.type} cx={cx} cy={cy} r={r} fill="none" stroke={ACTIVITY_META[d.type].color}
                strokeWidth={16} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-text">{total}</span>
          <span className="text-[11px] text-neutral-600">hoạt động</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {data.map((d) => (
          <li key={d.type} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: ACTIVITY_META[d.type].color }} />
            <span className="text-neutral-700">{ACTIVITY_META[d.type].label}</span>
            <span className="ml-auto font-semibold text-text">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
