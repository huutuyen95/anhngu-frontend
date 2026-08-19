/**
 * Nhiệm vụ TỰ ĐẶT của học viên — em thêm nội dung từ Thư viện, hạn 7 ngày.
 * Bài cô giao (`source='suggested'`) không lên màn Nhiệm vụ, nó thuộc "Lớp của em".
 */

/** Loại nội dung gắn được vào nhiệm vụ. Backend còn mở thêm được, FE cứ theo `type`. */
export type MissionContentType = "test" | "deck" | "document";

/** Khối nội dung đã chuẩn hoá — mọi loại đều có `title`/`meta`, nên dùng chung một thẻ. */
export type MissionContent = {
  type: MissionContentType | string;
  id: number;
  title: string;
  thumbnail_url: string | null;
  /** Dòng thông tin ngắn: "60 phút", "20 câu", "12 từ"… */
  meta: string[];
  skill?: string;
};

export type Mission = {
  id: number;
  status: "todo" | "doing" | "done" | string;
  source: "self" | "suggested" | string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string | null;
  /** `null` khi nội dung gốc đã bị xoá — FE ẩn thẻ đó đi. */
  content: MissionContent | null;
};

export type MissionTab = "upcoming" | "done";

export type MissionListResponse = {
  data: Mission[];
  /** Số ngày mục tiêu do backend quy định (hiện là 7). */
  target_days: number;
};

export const MISSION_TYPE_LABEL: Record<string, string> = {
  test: "Đề thi",
  deck: "Từ vựng",
  document: "Tài liệu",
};

/**
 * Số ngày còn lại tới hạn: âm = đã quá hạn, 0 = hết hạn hôm nay.
 * So theo NGÀY chứ không theo giờ — hạn là ngày, không phải mốc giờ cụ thể.
 */
export function daysLeft(dueDate: string | null): number | null {
  if (!dueDate) return null;

  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}
