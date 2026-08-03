"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  School,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { deleteClassroom, listClassrooms } from "@/lib/api/classrooms";
import {
  CLASS_STATUS_LABEL,
  type Classroom,
  type ClassStatus,
} from "@/lib/types/classroom";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CoverThumb } from "@/components/teacher/cover-thumb";
import { ClassFormModal } from "@/features/classes/class-form-modal";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<ClassStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  upcoming: "warning",
  ended: "neutral",
};

function ClassesView() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";

  const [rows, setRows] = useState<Classroom[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(q);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [confirmDel, setConfirmDel] = useState<Classroom | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      next.delete("new");
      router.replace(`/teacher/classes?${next.toString()}`);
    },
    [params, router],
  );

  const load = useCallback(() => {
    setLoading(true);
    listClassrooms({ q, status })
      .then((res) => {
        setRows(res.data);
        setTotal(res.meta.total);
      })
      .catch(() => toast.error("Không tải được danh sách lớp."))
      .finally(() => setLoading(false));
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setSearch(q), [q]);

  const summary = useMemo(() => {
    const students = rows.reduce((s, c) => s + c.students_count, 0);
    const openMissions = rows.reduce((s, c) => s + c.open_missions_count, 0);
    const pending = rows.reduce((s, c) => s + c.pending_review_count, 0);
    return { students, openMissions, pending };
  }, [rows]);

  const hasFilter = !!q || !!status;

  async function doDelete(c: Classroom, confirm: boolean) {
    try {
      await deleteClassroom(c.id, confirm);
      setConfirmDel(null);
      toast.success("Đã xoá lớp học.");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Còn học viên → mở confirm gõ xác nhận.
        setConfirmDel(c);
      } else {
        toast.error("Không xoá được lớp.");
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl" onClick={() => setMenuId(null)}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Lớp học</h1>
          <p className="text-sm text-text-secondary">
            {total} lớp · {summary.students} học viên · {summary.openMissions} bài đang mở ·{" "}
            {summary.pending} bài chờ chấm
          </p>
        </div>
        <Button
          iconLeft={<Plus className="size-4" />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Thêm lớp
        </Button>
      </div>

      {/* Filter */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              const v = e.target.value;
              setTimeout(() => setParam({ q: v || null }), 0);
            }}
            placeholder="Tìm tên lớp…"
            className="pl-10"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value || null })}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang diễn ra</option>
          <option value="upcoming">Chưa bắt đầu</option>
          <option value="ended">Đã kết thúc</option>
        </Select>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={() => router.replace("/teacher/classes")}>
            Xoá bộ lọc
          </Button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5">
          {hasFilter ? (
            <EmptyState
              icon={<Search className="size-7" />}
              title="Không tìm thấy lớp phù hợp"
              action={
                <Button variant="outline" size="sm" onClick={() => router.replace("/teacher/classes")}>
                  Xoá bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<School className="size-7" />}
              title="Chưa có lớp học nào"
              description="Tạo lớp đầu tiên để bắt đầu quản lý học sinh và giao bài."
              action={
                <Button size="sm" iconLeft={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
                  Thêm lớp
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <ClassCard
              key={c.id}
              c={c}
              highlighted={highlight === c.id}
              menuOpen={menuId === c.id}
              onMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuId(menuId === c.id ? null : c.id);
              }}
              onOpen={() => router.push(`/teacher/classes/${c.id}`)}
              onEdit={() => {
                setEditing(c);
                setFormOpen(true);
                setMenuId(null);
              }}
              onDelete={() => {
                setMenuId(null);
                doDelete(c, false);
              }}
            />
          ))}
        </div>
      )}

      <ClassFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSaved={(saved, { goToStudents }) => {
          if (goToStudents && !editing) {
            router.push(`/teacher/classes/${saved.id}?tab=students`);
          } else {
            setHighlight(saved.id);
            setTimeout(() => setHighlight(null), 2000);
            load();
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) return doDelete(confirmDel, true);
        }}
        title="Xoá lớp còn học viên?"
        danger
        confirmLabel="Xoá lớp"
        description={
          confirmDel
            ? `Lớp "${confirmDel.name}" còn ${confirmDel.students_count} học viên. Xoá lớp chỉ gỡ họ khỏi lớp, KHÔNG xoá tài khoản.`
            : null
        }
      />
    </div>
  );
}

function ClassCard({
  c,
  highlighted,
  menuOpen,
  onMenu,
  onOpen,
  onEdit,
  onDelete,
}: {
  c: Classroom;
  highlighted: boolean;
  menuOpen: boolean;
  onMenu: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const scoreTone =
    c.avg_score >= 8 ? "bg-success-soft" : c.avg_score >= 7 ? "bg-surface-alt" : c.avg_score > 0 ? "bg-warning-soft" : "bg-surface-alt";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Vào lớp ${c.name}`}
      className={cn(
        "flex cursor-pointer flex-col overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(58,51,48,0.08)] focus-visible:outline-2 focus-visible:outline-brand",
        highlighted && "ring-2 ring-brand",
        c.status === "ended" && "opacity-80"
      )}
    >
      <div className="relative aspect-video">
        <CoverThumb cover={c.cover_url} name={c.name} className="h-full w-full" />
        <button
          onClick={onMenu}
          aria-label="Menu lớp"
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-text shadow-sm hover:bg-white"
        >
          <MoreVertical className="size-4" />
        </button>
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-11 z-10 w-36 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt"
            >
              <Eye className="size-4" /> Xem
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt"
            >
              <Pencil className="size-4" /> Sửa
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-soft"
            >
              <Trash2 className="size-4" /> Xoá
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold text-text">{c.name}</h3>
          <StatusBadge tone={STATUS_TONE[c.status]}>{CLASS_STATUS_LABEL[c.status]}</StatusBadge>
        </div>

        {(c.starts_on || c.ends_on) && (
          <p className="-mt-1 text-xs text-text-muted">
            {c.starts_on ?? "?"} → {c.ends_on ?? "?"}
          </p>
        )}

        <div>
          <div className="mb-1 flex justify-between text-xs text-text-muted">
            <span>Tiến trình</span>
            <span>{c.progress_pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-brand" style={{ width: `${c.progress_pct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-alt py-2">
            <p className="font-display text-lg font-bold text-text">{c.students_count}</p>
            <p className="text-[10px] uppercase text-text-muted">Học viên</p>
          </div>
          <div className="rounded-xl bg-surface-alt py-2">
            <p className="font-display text-lg font-bold text-text">{c.open_missions_count}</p>
            <p className="text-[10px] uppercase text-text-muted">Bài mở</p>
          </div>
          <div className={cn("rounded-xl py-2", scoreTone)}>
            <p className="font-display text-lg font-bold text-text">{c.avg_score || "—"}</p>
            <p className="text-[10px] uppercase text-text-muted">Điểm TB</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          {c.pending_review_count > 0 ? (
            <StatusBadge tone="warning">{c.pending_review_count} chờ chấm</StatusBadge>
          ) : (
            <StatusBadge tone="success">Không có bài chờ</StatusBadge>
          )}
          {c.last_session && (
            <span className="text-text-muted">Buổi gần nhất: {c.last_session.title}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}>
      <ClassesView />
    </Suspense>
  );
}
