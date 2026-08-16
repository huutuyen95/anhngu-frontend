import Link from "next/link";
import { GraduationCap, Library } from "lucide-react";

/**
 * Nguồn của một lượt làm bài — khớp `test_attempts.source` + khối `mission` mà
 * `GET /attempts/{id}` và `GET /attempts/{id}/result` trả về.
 *
 * Luồng Thư viện và luồng lớp học dùng CHUNG các màn (intro · làm bài · kết quả), nên nếu
 * không nói rõ nguồn thì hai màn trông y hệt nhau: học viên làm bài cô giao xong lại thấy
 * nút "Về Nhiệm vụ" / "Làm lại từ đầu" của khu tự luyện. Khối này là thứ phân biệt chúng.
 */
export type AttemptSource = "assignment" | "library";

/**
 * Mọi trường ngoài `id` đều tuỳ chọn: trang giới thiệu đề mới chỉ biết mission id từ URL
 * (chưa có lượt làm nên chưa gọi được API), còn màn làm bài / kết quả thì có đủ.
 */
export type AttemptMission = {
  id: number;
  classroom_id?: number | null;
  classroom_name?: string | null;
  session_title?: string | null;
  session_order?: number | null;
  due_date?: string | null;
  attempts_allowed?: number | null;
  attempts_used?: number | null;
};

/** Bài cô giao thì luôn có `mission`; tự luyện thì `mission` = null. */
export type AttemptOrigin = {
  source?: AttemptSource | null;
  mission?: AttemptMission | null;
};

export function isAssignment(origin: AttemptOrigin): boolean {
  return origin.source === "assignment" && !!origin.mission;
}

/**
 * Còn lượt làm lại không. Tự luyện: luôn còn. Bài giao: theo `attempts_allowed`.
 * Chưa biết số lượt (payload rút gọn) thì coi như còn — BE vẫn chặn bằng 422.
 */
export function hasAttemptsLeft(origin: AttemptOrigin): boolean {
  const mission = origin.mission;
  if (!isAssignment(origin) || !mission) return true;
  if (mission.attempts_used == null || mission.attempts_allowed == null) return true;

  return mission.attempts_used < mission.attempts_allowed;
}

/** Đường về "nơi em đi vào": trang lớp cho bài giao, danh sách đề cho tự luyện. */
export function backHref(origin: AttemptOrigin, listHref: string): string {
  const classId = origin.mission?.classroom_id;

  return isAssignment(origin) && classId ? `/classes/${classId}` : listHref;
}

export function backLabel(origin: AttemptOrigin): string {
  return isAssignment(origin) ? "Về lớp học" : "Về Thư viện";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/**
 * Dải nhận diện đặt trên cùng màn kết quả / màn làm bài. Bài giao dùng tông xanh của lớp
 * học, tự luyện dùng tông trung tính — nhìn là biết ngay mình đang ở đâu.
 */
export function OriginBanner({
  origin,
  className = "",
}: {
  origin: AttemptOrigin;
  className?: string;
}) {
  const mission = origin.mission;

  if (isAssignment(origin) && mission) {
    const session =
      mission.session_order !== null && mission.session_order !== undefined
        ? `Buổi ${mission.session_order + 1}${mission.session_title ? `: ${mission.session_title}` : ""}`
        : mission.session_title;

    return (
      <div
        className={`rounded-[16px] border-[1.5px] border-accent-2-300 bg-accent-2-200 px-4 py-3 ${className}`}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-accent-2-900">
          <GraduationCap className="size-[15px]" strokeWidth={2.6} />
          Bài cô giao
          {mission.classroom_name && ` · ${mission.classroom_name}`}
        </p>
        <p className="mt-1 text-[12.5px] font-medium leading-[1.5] text-accent-2-900/80">
          {session && <>{session} · </>}
          Điểm bài này vào bảng điểm của lớp.
          {mission.due_date && <> Hạn nộp {formatDate(mission.due_date)}.</>}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-[16px] border-[1.5px] border-border bg-surface-alt px-4 py-3 ${className}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
        <Library className="size-[15px]" strokeWidth={2.6} />
        Tự luyện · Thư viện
      </p>
      <p className="mt-1 text-[12.5px] font-medium leading-[1.5] text-text-secondary">
        Em làm lại bao nhiêu lần cũng được — điểm ở đây KHÔNG tính vào bảng điểm lớp.
      </p>
    </div>
  );
}

/** Chip gọn cho thanh tiêu đề màn làm bài (chỗ chật, không đủ chỗ cho cả dải). */
export function OriginChip({ origin }: { origin: AttemptOrigin }) {
  const mission = origin.mission;

  if (isAssignment(origin) && mission) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-2-200 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.4px] text-accent-2-900">
        <GraduationCap className="size-[13px]" strokeWidth={2.6} />
        Bài cô giao{mission.classroom_name && ` · ${mission.classroom_name}`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.4px] text-neutral-700">
      <Library className="size-[13px]" strokeWidth={2.6} />
      Tự luyện
    </span>
  );
}

/** Dòng "Đã dùng 1/1 lượt" — chỉ có nghĩa với bài cô giao. */
export function AttemptsNote({ origin }: { origin: AttemptOrigin }) {
  const mission = origin.mission;

  if (!isAssignment(origin) || !mission) return null;
  if (mission.attempts_used == null || mission.attempts_allowed == null) return null;

  return (
    <p className="text-center text-[12px] font-semibold text-text-secondary">
      Đã dùng {mission.attempts_used}/{mission.attempts_allowed} lượt cô cho
    </p>
  );
}

/** Nút chính "quay về" — đích và nhãn đổi theo nguồn. */
export function BackButton({
  origin,
  listHref,
}: {
  origin: AttemptOrigin;
  listHref: string;
}) {
  return (
    <Link
      href={backHref(origin, listHref)}
      className="flex h-[46px] items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none"
    >
      {backLabel(origin)}
    </Link>
  );
}
