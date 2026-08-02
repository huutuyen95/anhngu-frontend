"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTest, listTests } from "@/lib/api/tests";
import type { Test, TestListMeta } from "@/lib/types/test";
import { SKILL_LABEL } from "@/lib/types/test";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function TestsView() {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo(
    () => ({
      q: params.get("q") ?? "",
      skill: params.get("skill") ?? "",
      is_published: params.get("published") ?? "",
      page: params.get("page") ?? "1",
    }),
    [params],
  );

  const [rows, setRows] = useState<Test[]>([]);
  const [meta, setMeta] = useState<TestListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(filters.q);
  const [confirmDelete, setConfirmDelete] = useState<Test | null>(null);

  const setParam = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (resetPage) next.delete("page");
      router.replace(`/teacher/tests?${next.toString()}`);
    },
    [params, router],
  );

  const load = useCallback(() => {
    setLoading(true);
    listTests({
      q: filters.q,
      skill: filters.skill,
      is_published: filters.is_published,
      page: filters.page,
    })
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
      })
      .catch(() => toast.error("Không tải được danh sách đề thi."))
      .finally(() => setLoading(false));
  }, [filters.q, filters.skill, filters.is_published, filters.page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onSearchChange(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam({ q: v || null }), 350);
  }

  const hasFilters = !!filters.q || !!filters.skill || !!filters.is_published;

  async function doDelete(test: Test) {
    try {
      await deleteTest(test.id);
      setConfirmDelete(null);
      toast.success("Đã xoá đề thi.");
      load();
    } catch {
      toast.error("Không xoá được đề thi.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Đề thi</h1>
          <p className="text-sm text-text-secondary">
            {meta ? `${meta.total} đề thi` : "Đang tải…"}
          </p>
        </div>
        <ButtonLink href="/teacher/tests/new" size="sm" iconLeft={<Plus className="size-4" />}>
          Tạo đề
        </ButtonLink>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên đề…"
            className="pl-10"
          />
        </div>
        <select
          value={filters.skill}
          onChange={(e) => setParam({ skill: e.target.value || null })}
          className="h-11 rounded-[14px] border-[1.5px] border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-brand"
        >
          <option value="">Mọi kỹ năng</option>
          {Object.entries(SKILL_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.is_published}
          onChange={(e) => setParam({ published: e.target.value || null })}
          className="h-11 rounded-[14px] border-[1.5px] border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-brand"
        >
          <option value="">Mọi trạng thái</option>
          <option value="true">Đã đăng</option>
          <option value="false">Nháp</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => router.replace("/teacher/tests")}>
            Xoá bộ lọc
          </Button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="h-4 flex-1 animate-pulse rounded bg-surface-alt" />
                <div className="h-4 w-20 animate-pulse rounded bg-surface-alt" />
                <div className="h-4 w-20 animate-pulse rounded bg-surface-alt" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            {hasFilters ? (
              <EmptyState
                icon={<Search className="size-7" />}
                title="Không tìm thấy đề phù hợp"
                description="Thử đổi từ khoá hoặc xoá bớt bộ lọc."
                action={
                  <Button variant="outline" size="sm" onClick={() => router.replace("/teacher/tests")}>
                    Xoá bộ lọc
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<FileText className="size-7" />}
                title="Chưa có đề thi nào"
                description="Tạo đề trắc nghiệm hoặc đề viết luận đầu tiên."
                action={
                  <ButtonLink href="/teacher/tests/new" size="sm" iconLeft={<Plus className="size-4" />}>
                    Tạo đề
                  </ButtonLink>
                }
              />
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Tên đề</th>
                <th className="px-3 py-3 text-left font-semibold">Dạng</th>
                <th className="hidden px-3 py-3 text-left font-semibold sm:table-cell">Số câu</th>
                <th className="px-3 py-3 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-border transition-colors hover:bg-surface-alt">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text">{t.title}</div>
                    <div className="text-xs text-text-muted">
                      {t.duration_minutes} phút · {t.total_score} điểm
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {t.skill === "writing" ? (
                      <StatusBadge tone="success">Writing</StatusBadge>
                    ) : (
                      <StatusBadge tone="info">Trắc nghiệm</StatusBadge>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 text-text-secondary sm:table-cell">
                    {t.question_count ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {t.is_published ? (
                      <StatusBadge tone="success">Đã đăng</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Nháp</StatusBadge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn label="Sửa" onClick={() => router.push(`/teacher/tests/${t.id}/edit`)}>
                        <Pencil className="size-4" />
                      </IconBtn>
                      <IconBtn label="Xoá" danger onClick={() => setConfirmDelete(t)}>
                        <Trash2 className="size-4" />
                      </IconBtn>
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

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) return doDelete(confirmDelete);
        }}
        title="Xoá đề thi?"
        danger
        confirmLabel="Xoá"
        description={
          confirmDelete ? (
            <>
              Xoá đề <b>{confirmDelete.title}</b>? Hành động này không thể hoàn tác.
            </>
          ) : null
        }
      />
    </div>
  );
}

export default function TestsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}>
      <TestsView />
    </Suspense>
  );
}

function IconBtn({
  label,
  children,
  onClick,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "flex size-8 items-center justify-center rounded-full transition-colors " +
        (danger
          ? "text-text-muted hover:bg-danger-soft hover:text-danger"
          : "text-text-muted hover:bg-surface-alt hover:text-text")
      }
    >
      {children}
    </button>
  );
}
