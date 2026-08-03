"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Eye } from "lucide-react";
import { toast } from "sonner";
import { listAttempts } from "@/lib/api/attempts";
import type { Attempt, AttemptListMeta, AttemptStatus } from "@/lib/types/attempt";
import { ATTEMPT_STATUS_LABEL, ATTEMPT_STATUS_TONE } from "@/lib/types/attempt";
import { listClassrooms } from "@/lib/api/classrooms";
import type { ClassroomRef } from "@/lib/types/student";
import { SKILL_LABEL } from "@/lib/types/test";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

function ResultsView() {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo(
    () => ({
      status: params.get("status") ?? "",
      classroom_id: params.get("class") ?? "",
      page: params.get("page") ?? "1",
    }),
    [params],
  );

  const [rows, setRows] = useState<Attempt[]>([]);
  const [meta, setMeta] = useState<AttemptListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<ClassroomRef[]>([]);

  const setParam = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (resetPage) next.delete("page");
      router.replace(`/teacher/results?${next.toString()}`);
    },
    [params, router],
  );

  const load = useCallback(() => {
    setLoading(true);
    listAttempts({ status: filters.status, classroom_id: filters.classroom_id, page: filters.page })
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
      })
      .catch(() => toast.error("Không tải được danh sách bài làm."))
      .finally(() => setLoading(false));
  }, [filters.status, filters.classroom_id, filters.page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listClassrooms().then((r) => setClassrooms(r.data)).catch(() => {});
  }, []);

  const isPendingTab = filters.status === "pending_review";

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Kết quả làm bài</h1>
        <p className="text-sm text-text-secondary">{meta ? `${meta.total} bài làm` : "Đang tải…"}</p>
      </div>

      {/* Tab nhanh */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <TabButton active={filters.status === ""} onClick={() => setParam({ status: null })}>
          Tất cả
        </TabButton>
        <TabButton active={isPendingTab} onClick={() => setParam({ status: "pending_review" })}>
          Chờ chấm
        </TabButton>

        <Select wrapClassName="ml-auto"
          value={["", "pending_review"].includes(filters.status) ? "" : filters.status}
          onChange={(e) => setParam({ status: e.target.value || null })}>
          <option value="">Trạng thái khác…</option>
          {(Object.keys(ATTEMPT_STATUS_LABEL) as AttemptStatus[])
            .filter((s) => s !== "pending_review")
            .map((s) => (
              <option key={s} value={s}>
                {ATTEMPT_STATUS_LABEL[s]}
              </option>
            ))}
        </Select>
        {classrooms.length > 0 && (
          <Select
            value={filters.classroom_id}
            onChange={(e) => setParam({ class: e.target.value || null })}>
            <option value="">Mọi lớp</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="h-4 flex-1 animate-pulse rounded bg-surface-alt" />
                <div className="h-4 w-24 animate-pulse rounded bg-surface-alt" />
                <div className="h-4 w-16 animate-pulse rounded bg-surface-alt" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<ClipboardList className="size-7" />}
              title={isPendingTab ? "Không còn bài nào chờ chấm" : "Chưa có bài làm nào"}
              description={isPendingTab ? "Mọi bài viết luận đã được chấm." : "Học sinh chưa nộp bài nào phù hợp bộ lọc."}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Đề thi</th>
                <th className="px-3 py-3 text-left font-semibold">Dạng</th>
                <th className="px-3 py-3 text-left font-semibold">Học sinh</th>
                <th className="hidden px-3 py-3 text-left font-semibold sm:table-cell">Điểm</th>
                <th className="px-3 py-3 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-border transition-colors hover:bg-surface-alt">
                  <td className="px-4 py-3 font-medium text-text">{a.test.title}</td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={a.test.skill === "writing" ? "success" : "info"}>
                      {SKILL_LABEL[a.test.skill]}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-text">{a.student.name}</div>
                    <div className="text-xs text-text-muted">{a.student.email}</div>
                  </td>
                  <td className="hidden px-3 py-3 text-text-secondary sm:table-cell">
                    {a.total_score !== null
                      ? a.total_score
                      : a.correct_count !== null && a.question_count !== null
                        ? `${a.correct_count}/${a.question_count}`
                        : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={ATTEMPT_STATUS_TONE[a.status]}>{ATTEMPT_STATUS_LABEL[a.status]}</StatusBadge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end">
                      <ButtonLink href={`/teacher/results/${a.id}`} variant="ghost" size="icon-sm" aria-label="Xem chi tiết">
                        <Eye className="size-4" />
                      </ButtonLink>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={meta.current_page <= 1}
            onClick={() => setParam({ page: String(meta.current_page - 1) }, false)}
          >
            Trước
          </Button>
          <span className="text-sm text-text-secondary">
            Trang {meta.current_page}/{meta.last_page}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={meta.current_page >= meta.last_page}
            onClick={() => setParam({ page: String(meta.current_page + 1) }, false)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 rounded-full px-4 text-sm font-semibold transition-colors",
        active ? "bg-brand text-white" : "border-[1.5px] border-border bg-surface text-text hover:bg-surface-alt",
      )}
    >
      {children}
    </button>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}>
      <ResultsView />
    </Suspense>
  );
}
