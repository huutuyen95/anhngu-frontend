"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { addMission, removeMission } from "@/lib/api/missions";
import { daysLeft, type Mission, type MissionContentType } from "@/lib/types/mission";

/**
 * Nút "Thêm vào nhiệm vụ" ở trang chi tiết nội dung trong Thư viện.
 *
 * Dùng được cho mọi loại nội dung (`test`/`deck`/`document`) — chỉ cần truyền đúng
 * `type` + `id`; backend tự đặt hạn 7 ngày.
 *
 * `initial` là nhiệm vụ hiện có của em cho nội dung này (trang chi tiết trả kèm),
 * để nút biết đang ở trạng thái nào mà không phải gọi thêm API.
 */
export function AddToMissionButton({
  type,
  contentId,
  initial,
}: {
  type: MissionContentType;
  contentId: number;
  initial: Mission | null;
}) {
  const [mission, setMission] = useState<Mission | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setBusy(true);
    setError(null);
    try {
      const res = await addMission(type, contentId);
      setMission(res.mission);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thêm được vào nhiệm vụ.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!mission) return;
    setBusy(true);
    setError(null);
    try {
      await removeMission(mission.id);
      setMission(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không gỡ được khỏi nhiệm vụ.");
    } finally {
      setBusy(false);
    }
  }

  const left = mission ? daysLeft(mission.due_date) : null;
  const done = mission?.status === "done";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {!mission ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy}
            className="flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none disabled:opacity-60"
          >
            <span aria-hidden>＋</span>
            {busy ? "Đang thêm…" : "Thêm vào nhiệm vụ"}
          </button>
        ) : (
          <>
            <span
              className="flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold"
              style={
                done
                  ? { background: "#F1F8DE", color: "#5E8418" }
                  : { background: "#FDEBDD", color: "#D65F27" }
              }
            >
              <span aria-hidden>✓</span>
              {done
                ? "Đã hoàn thành nhiệm vụ"
                : left !== null && left >= 0
                  ? `Đã trong nhiệm vụ · còn ${left} ngày`
                  : "Đã trong nhiệm vụ"}
            </span>

            {done ? (
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy}
                className="flex h-11 items-center rounded-full border-[1.5px] border-border bg-surface px-4 text-[13px] font-bold text-text-secondary transition-colors hover:border-brand hover:text-brand-bold disabled:opacity-60"
              >
                {busy ? "Đang đặt lại…" : "Đặt lại mục tiêu 7 ngày"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="flex h-11 items-center rounded-full border-[1.5px] border-border bg-surface px-4 text-[13px] font-bold text-text-secondary transition-colors hover:border-[#F0B5A9] hover:text-[#C1442F] disabled:opacity-60"
              >
                {busy ? "Đang gỡ…" : "Gỡ khỏi nhiệm vụ"}
              </button>
            )}

            <Link
              href="/missions"
              className="text-[13px] font-bold text-brand-bold hover:underline"
            >
              Xem nhiệm vụ
            </Link>
          </>
        )}
      </div>

      {error && <p className="text-[12.5px] font-semibold text-[#C1442F]">{error}</p>}
    </div>
  );
}
