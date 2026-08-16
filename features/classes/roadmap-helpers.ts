import {
  FileText,
  ClipboardList,
  Headphones,
  PenLine,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { RoadmapItem } from "@/lib/types/classroom";
import { classTestsRoot } from "@/features/tests/routes";

export type ItemCta = { label: string; href: string | null; disabled: boolean };

/**
 * Nhãn + đích đến của nút CTA theo loại + trạng thái (bảng 13 dòng).
 *
 * Đề thi/writing đi qua root CỦA LỚP kèm `?mission=` — không phải `/library/tests`. Nhờ đó
 * backend gắn lượt làm vào đúng nhiệm vụ, và lượt em tự luyện cùng đề ở Thư viện không bị
 * tính nhầm thành đã làm bài cô giao.
 */
export function itemCta(item: RoadmapItem, classId: number | string): ItemCta {
  const base = `${classTestsRoot(classId)}/${item.target_id}`;
  // `item.id` LÀ mission id (roadmap dựng thẻ từ mission). Giữ nó trên cả trang kết quả để
  // nút "Làm lại" mở đúng lượt của nhiệm vụ chứ không rơi về tự luyện.
  const mission = `?mission=${item.id}`;
  const t = `${base}${mission}`;
  const attempt = item.attempt_id;
  const at = (attemptId: number) => `${base}/attempt/${attemptId}${mission}`;
  const resultAt = (attemptId: number) => `${base}/result/${attemptId}${mission}`;
  const exhausted = item.attempts_used >= item.attempts_allowed;

  switch (item.type) {
    case "document":
      return {
        // Học TRONG LỚP — không sang Thư viện.
        label: item.status === "viewed" ? "Xem lại" : "Xem bài",
        href: `/classes/${classId}/documents/${item.target_id}`,
        disabled: false,
      };

    case "deck":
      return {
        // Mở màn chi tiết bộ từ TRONG LỚP (danh sách thẻ + học ngay).
        label: item.status === "viewed" ? "Ôn lại" : "Học tiếp",
        href: `/classes/${classId}/vocab/${item.target_id}`,
        disabled: false,
      };

    case "writing":
      if (item.status === "in_progress")
        return { label: "Viết tiếp", href: attempt ? at(attempt) : t, disabled: false };
      if (item.status === "pending_review" || item.status === "submitted")
        return { label: "Xem bài đã nộp", href: attempt ? resultAt(attempt) : t, disabled: false };
      if (item.status === "graded")
        return { label: "Xem nhận xét", href: attempt ? resultAt(attempt) : t, disabled: false };
      return { label: "Viết bài", href: t, disabled: false };

    case "test":
    default:
      if (item.status === "in_progress")
        return { label: "Tiếp tục", href: attempt ? at(attempt) : t, disabled: false };
      if (item.status === "graded" || item.status === "submitted" || item.status === "pending_review")
        return { label: "Xem kết quả", href: attempt ? resultAt(attempt) : t, disabled: false };
      // Chưa làm: hết lượt thì chặn (vẫn xem được kết quả nếu có attempt).
      if (exhausted)
        return { label: "Đã dùng hết lượt", href: attempt ? resultAt(attempt) : null, disabled: !attempt };
      return { label: "Làm bài", href: t, disabled: false };
  }
}

/** Dòng phụ "Đã dùng hết 1/1 lượt" cho đề/writing khi cạn lượt. */
export function attemptsNote(item: RoadmapItem): string | null {
  if ((item.type === "test" || item.type === "writing") && item.attempts_allowed > 0 && item.attempts_used >= item.attempts_allowed) {
    return `Đã dùng hết ${item.attempts_used}/${item.attempts_allowed} lượt`;
  }
  return null;
}

type TypeMeta = { icon: LucideIcon; chip: string; iconWrap: string };

/** Icon + màu theo loại nội dung (dùng token organic, không hex). */
export function typeMeta(item: RoadmapItem): TypeMeta {
  switch (item.type) {
    case "document":
      return { icon: FileText, chip: "Tài liệu", iconWrap: "bg-accent-100 text-accent-700" };
    case "writing":
      return { icon: PenLine, chip: "Viết", iconWrap: "bg-accent-200 text-accent-800" };
    case "deck":
      return { icon: Layers, chip: "Từ vựng", iconWrap: "bg-neutral-200 text-neutral-700" };
    case "test":
    default:
      return item.meta.startsWith("Đề nghe")
        ? { icon: Headphones, chip: "Đề nghe", iconWrap: "bg-accent-2-200 text-accent-2-800" }
        : { icon: ClipboardList, chip: "Trắc nghiệm", iconWrap: "bg-accent-2-200 text-accent-2-800" };
  }
}

/** Nhãn + màu chip trạng thái (luôn kèm chữ, không chỉ màu). */
export function statusChip(item: RoadmapItem): { label: string; cls: string } | null {
  switch (item.status) {
    case "graded":
      return { label: "Đã chấm", cls: "bg-accent-2-200 text-accent-2-900" };
    case "submitted":
      return { label: "Đã nộp", cls: "bg-accent-2-200 text-accent-2-900" };
    case "pending_review":
      return { label: "Chờ cô chấm", cls: "bg-accent-100 text-accent-800" };
    case "in_progress":
      return { label: "Đang làm", cls: "bg-accent-100 text-accent-800" };
    case "viewed":
      return { label: "Đã xong", cls: "bg-accent-2-200 text-accent-2-900" };
    default:
      return null;
  }
}
