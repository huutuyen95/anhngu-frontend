"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { listMissions, removeMission } from "@/lib/api/missions";
import { LIBRARY_TESTS_ROOT } from "@/features/tests/routes";
import { MissionCard } from "@/features/missions/mission-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Mission, MissionTab } from "@/lib/types/mission";

/* ────────────────────────────────────────────────────────────────────────────
   Màn "Nhiệm vụ" — mục tiêu em TỰ ĐẶT cho mình.

   Em vào Thư viện, mở một đề rồi bấm "Thêm vào nhiệm vụ" → nó nằm ở tab
   "7 ngày tới". Làm xong đề đó thì tự chuyển sang tab "Đã hoàn thành".

   Bài CÔ GIAO không hiện ở đây — chỗ của nó là "Lớp của em".
   ──────────────────────────────────────────────────────────────────────────── */

const TABS: { key: MissionTab; label: string }[] = [
  { key: "upcoming", label: "7 ngày tới" },
  { key: "done", label: "Hoàn thành" },
];

export function StudentMissions() {
  const [tab, setTab] = useState<MissionTab>("upcoming");
  // Giữ kèm tab đã tải: đổi tab là `loaded.tab` lệch ngay → hiện skeleton, khỏi phải
  // setState đồng bộ trong effect (gây cascading render).
  const [loaded, setLoaded] = useState<{ tab: MissionTab; data: Mission[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  // Đếm cho cả 2 tab để nhãn tab hiện số ngay, không phải bấm vào mới biết.
  const [counts, setCounts] = useState<Record<MissionTab, number | null>>({
    upcoming: null,
    done: null,
  });

  const missions = loaded?.tab === tab ? loaded.data : null;

  const load = useCallback(async (target: MissionTab) => {
    try {
      const res = await listMissions(target);
      setLoaded({ tab: target, data: res.data });
      setCounts((prev) => ({ ...prev, [target]: res.data.length }));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được nhiệm vụ.");
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  // Đếm tab còn lại một lần, để hiện số trên nhãn.
  useEffect(() => {
    const other: MissionTab = tab === "upcoming" ? "done" : "upcoming";
    if (counts[other] !== null) return;
    listMissions(other)
      .then((res) => setCounts((prev) => ({ ...prev, [other]: res.data.length })))
      .catch(() => {
        // Chỉ là con số trên nhãn — hỏng thì thôi, không làm phiền em.
      });
  }, [tab, counts]);

  async function handleRemove(mission: Mission) {
    setRemovingId(mission.id);
    try {
      await removeMission(mission.id);
      setLoaded((prev) =>
        prev ? { ...prev, data: prev.data.filter((m) => m.id !== mission.id) } : prev,
      );
      setCounts((prev) => ({ ...prev, [tab]: Math.max(0, (prev[tab] ?? 1) - 1) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không gỡ được nhiệm vụ.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6">
      {/* Hai tab — điểm neo thị giác đầu trang, không banner, không tiêu đề */}
      <div className="flex flex-wrap items-center gap-2.5">
        {TABS.map((item) => {
          const active = tab === item.key;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border-[1.5px] px-[26px] py-[13px] text-[15.5px] font-bold transition-colors",
                active
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-surface text-text-secondary hover:border-brand hover:text-brand-bold",
              )}
            >
              {item.label}
              {count !== null && ` (${count})`}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm font-semibold text-[#C1442F]">{error}</p>}

      {missions === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[90px] rounded-[20px]" />
          <Skeleton className="h-[90px] rounded-[20px]" />
        </div>
      ) : missions.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="flex flex-col gap-3">
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              removing={removingId === mission.id}
              onRemove={() => handleRemove(mission)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: MissionTab }) {
  const upcoming = tab === "upcoming";

  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-border bg-surface px-8 py-12 text-center">
      <p className="font-display text-[18px] font-bold text-text">
        {upcoming ? "Chưa có nhiệm vụ nào" : "Chưa hoàn thành bài nào"}
      </p>
      <p className="max-w-[420px] text-sm leading-[1.6] text-text-secondary">
        {upcoming
          ? "Em vào Thư viện, mở một đề rồi bấm “Thêm vào nhiệm vụ” — đề đó sẽ nằm ở đây kèm mục tiêu 7 ngày."
          : "Làm xong đề nào trong nhiệm vụ, đề đó sẽ chuyển sang mục này."}
      </p>
      {upcoming && (
        <Link
          href={LIBRARY_TESTS_ROOT}
          className="mt-1 flex h-11 items-center rounded-full bg-brand px-6 text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none"
        >
          Chọn đề trong Thư viện
        </Link>
      )}
    </div>
  );
}
