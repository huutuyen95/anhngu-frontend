"use client";

import Link from "next/link";
import { LIBRARY_TESTS_ROOT } from "@/features/tests/routes";
import {
  MISSION_TYPE_LABEL,
  daysLeft,
  type Mission,
  type MissionContent,
} from "@/lib/types/mission";

/* ────────────────────────────────────────────────────────────────────────────
   Thẻ một nhiệm vụ. MỘT thẻ dùng cho MỌI loại nội dung: backend đã chuẩn hoá
   `content` (title/meta/thumbnail) nên thêm loại mới chỉ cần khai đường dẫn ở
   `contentHref` và nhãn ở MISSION_TYPE_LABEL — không phải dựng thẻ riêng.
   ──────────────────────────────────────────────────────────────────────────── */

/** Đường vào nội dung. Loại chưa có màn riêng thì trả null → ẩn nút. */
function contentHref(content: MissionContent): string | null {
  switch (content.type) {
    case "test":
      return `${LIBRARY_TESTS_ROOT}/${content.id}`;
    case "deck":
      return `/library/vocab/${content.id}`;
    case "document":
      return `/library/documents/${content.id}`;
    default:
      return null;
  }
}

/** Chip hạn: quá hạn → đỏ, còn ≤2 ngày → vàng, còn lại → be. */
function dueChip(due: string | null) {
  const left = daysLeft(due);
  if (left === null) return null;

  if (left < 0) {
    return { label: `Quá hạn ${Math.abs(left)} ngày`, bg: "#FDE7E2", fg: "#C1442F" };
  }
  if (left === 0) return { label: "Hạn hôm nay", bg: "#FFF3D3", fg: "#B8860B" };
  if (left <= 2) return { label: `Còn ${left} ngày`, bg: "#FFF3D3", fg: "#B8860B" };
  return { label: `Còn ${left} ngày`, bg: "#F5EFDF", fg: "#8A8073" };
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function MissionCard({
  mission,
  removing,
  onRemove,
}: {
  mission: Mission;
  removing: boolean;
  onRemove: () => void;
}) {
  const content = mission.content;
  if (!content) return null; // nội dung gốc đã bị xoá

  const done = mission.status === "done";
  const href = contentHref(content);
  const chip = done ? null : dueChip(mission.due_date);
  const typeLabel = MISSION_TYPE_LABEL[content.type] ?? "Nội dung";

  return (
    <article className="flex items-center gap-4 rounded-[20px] border-[1.5px] border-border bg-surface p-4">
      <span
        className="flex size-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-brand-soft font-display text-lg font-bold text-brand-bold"
        aria-hidden
      >
        {content.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.thumbnail_url} alt="" className="size-full object-cover" />
        ) : (
          typeLabel.charAt(0)
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.4px] text-text-secondary">
            {typeLabel}
          </span>
          {chip && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
              style={{ background: chip.bg, color: chip.fg }}
            >
              {chip.label}
            </span>
          )}
          {done && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
              style={{ background: "#F1F8DE", color: "#5E8418" }}
            >
              Đã hoàn thành{mission.completed_at ? ` · ${formatDate(mission.completed_at)}` : ""}
            </span>
          )}
        </div>

        <p className="truncate font-display text-[17px] font-bold text-text">{content.title}</p>

        {content.meta.length > 0 && (
          <p className="mt-0.5 truncate text-xs font-semibold text-text-muted">
            {content.meta.join(" · ")}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {href && (
          <Link
            href={href}
            className="flex h-[42px] items-center rounded-full bg-brand px-5 text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none"
          >
            {done ? "Làm lại" : "Làm ngay"}
          </Link>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="flex h-[42px] items-center rounded-full border-[1.5px] border-border bg-surface px-4 text-[13px] font-bold text-text-secondary transition-colors hover:border-[#F0B5A9] hover:text-[#C1442F] disabled:opacity-60"
        >
          {removing ? "Đang gỡ…" : "Gỡ"}
        </button>
      </div>
    </article>
  );
}
