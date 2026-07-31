"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Pencil,
  Trash2,
  RotateCcw,
  Search,
  KeyRound,
  Copy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/api";
import {
  bulkStudents,
  deleteStudent,
  importTemplateUrl,
  listStudents,
  resetStudentPassword,
  restoreStudent,
  setStudentStatus,
} from "@/lib/api/students";
import { listClassrooms } from "@/lib/api/classrooms";
import type { ClassroomRef, Student, StudentListMeta } from "@/lib/types/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StudentFormModal } from "@/features/students/student-form-modal";
import { ImportWizard } from "@/features/students/import-wizard";

function StudentsView() {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo(
    () => ({
      q: params.get("q") ?? "",
      status: params.get("status") ?? "",
      classroom_id: params.get("class") ?? "",
      trashed: params.get("trashed") ?? "",
      page: params.get("page") ?? "1",
    }),
    [params],
  );
  const trashedMode = filters.trashed === "1";

  const [rows, setRows] = useState<Student[]>([]);
  const [meta, setMeta] = useState<StudentListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRef[]>([]);
  const [search, setSearch] = useState(filters.q);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmForce, setConfirmForce] = useState<Student | null>(null);

  // Cập nhật 1 tham số URL (reset page khi đổi bộ lọc).
  const setParam = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (resetPage) next.delete("page");
      router.replace(`/teacher/students?${next.toString()}`);
    },
    [params, router],
  );

  const load = useCallback(() => {
    setLoading(true);
    setSelected([]);
    listStudents({
      q: filters.q,
      is_active: filters.status,
      classroom_id: filters.classroom_id,
      trashed: filters.trashed,
      page: filters.page,
    })
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
      })
      .catch(() => toast.error("Không tải được danh sách học sinh."))
      .finally(() => setLoading(false));
  }, [filters.q, filters.status, filters.classroom_id, filters.trashed, filters.page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listClassrooms().then((r) => setClassrooms(r.data)).catch(() => {});
  }, []);

  // Debounce ô tìm kiếm → URL.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);
  function onSearchChange(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam({ q: v || null }), 350);
  }

  const hasFilters =
    !!filters.q || !!filters.status || !!filters.classroom_id || trashedMode;

  // Chọn hàng.
  const allChecked = rows.length > 0 && selected.length === rows.length;
  const someChecked = selected.length > 0 && !allChecked;
  function toggleAll() {
    setSelected(allChecked ? [] : rows.map((r) => r.id));
  }
  function toggleOne(id: number) {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  // Bật/tắt trạng thái (optimistic + undo).
  async function toggleStatus(student: Student) {
    const next = !student.is_active;
    setRows((p) => p.map((r) => (r.id === student.id ? { ...r, is_active: next } : r)));
    try {
      await setStudentStatus(student.id, next);
      toast.success(next ? "Đã mở tài khoản" : "Đã khoá tài khoản", {
        action: {
          label: "Hoàn tác",
          onClick: async () => {
            setRows((p) => p.map((r) => (r.id === student.id ? { ...r, is_active: !next } : r)));
            await setStudentStatus(student.id, !next).catch(() => {});
          },
        },
      });
    } catch {
      setRows((p) => p.map((r) => (r.id === student.id ? { ...r, is_active: !next } : r)));
      toast.error("Không đổi được trạng thái.");
    }
  }

  async function doDelete(student: Student) {
    await deleteStudent(student.id);
    setConfirmDelete(null);
    toast.success("Đã chuyển vào thùng rác", {
      action: {
        label: "Hoàn tác",
        onClick: async () => {
          await restoreStudent(student.id).catch(() => {});
          load();
        },
      },
    });
    load();
  }

  async function doForceDelete(student: Student) {
    await deleteStudent(student.id, true);
    setConfirmForce(null);
    toast.success("Đã xoá vĩnh viễn.");
    load();
  }

  async function doRestore(student: Student) {
    await restoreStudent(student.id);
    toast.success("Đã phục hồi học sinh.");
    load();
  }

  async function doBulk(action: "lock" | "unlock" | "delete") {
    await bulkStudents({ action, ids: selected });
    setConfirmBulkDelete(false);
    toast.success(
      action === "delete"
        ? `Đã xoá ${selected.length} học sinh`
        : action === "lock"
          ? "Đã khoá các tài khoản đã chọn"
          : "Đã mở các tài khoản đã chọn",
    );
    load();
  }

  async function doResetPassword(student: Student) {
    const { temp_password } = await resetStudentPassword(student.id);
    setTempPassword({ email: student.email, password: temp_password });
  }

  function onCreated(student: Student, pw: string) {
    setTempPassword({ email: student.email, password: pw });
    setHighlightId(student.id);
    setTimeout(() => setHighlightId(null), 2000);
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Học sinh</h1>
          <p className="text-sm text-text-secondary">
            {meta ? `${meta.total} học sinh` : "Đang tải…"}
            {trashedMode && " · đang xem thùng rác"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Download className="size-4" />}
            onClick={() =>
              downloadFile(importTemplateUrl(), "mau-import-hoc-sinh.xlsx").catch(() =>
                toast.error("Không tải được file mẫu."),
              )
            }
          >
            Tải Excel mẫu
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconLeft={<Upload className="size-4" />}
            onClick={() => setImportOpen(true)}
          >
            Import Excel
          </Button>
          {!trashedMode && (
            <Button
              size="sm"
              iconLeft={<UserPlus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Thêm học sinh
            </Button>
          )}
        </div>
      </div>

      {/* FilterBar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT…"
            className="pl-10"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setParam({ status: e.target.value || null })}
          className="h-11 rounded-[14px] border-[1.5px] border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-brand"
        >
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã khoá</option>
        </select>
        {classrooms.length > 0 && (
          <select
            value={filters.classroom_id}
            onChange={(e) => setParam({ class: e.target.value || null })}
            className="h-11 rounded-[14px] border-[1.5px] border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-brand"
          >
            <option value="">Mọi lớp</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <Button
          variant={trashedMode ? "danger" : "ghost"}
          size="sm"
          iconLeft={<Trash2 className="size-4" />}
          onClick={() => setParam({ trashed: trashedMode ? null : "1" })}
        >
          {trashedMode ? "Đang xem đã xoá" : "Đã xoá"}
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.replace("/teacher/students")}
          >
            Xoá bộ lọc
          </Button>
        )}
      </div>

      {/* Panel mật khẩu tạm */}
      {tempPassword && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-brand/40 bg-brand-soft px-4 py-3">
          <div className="text-sm">
            <p className="font-semibold text-text">
              Mật khẩu tạm cho {tempPassword.email}
            </p>
            <p className="text-text-secondary">
              Chỉ hiện <b>một lần</b> — hãy gửi cho học sinh ngay:
              <code className="ml-2 rounded-md bg-surface px-2 py-0.5 font-mono text-brand-bold">
                {tempPassword.password}
              </code>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              iconLeft={<Copy className="size-4" />}
              onClick={() => {
                navigator.clipboard.writeText(tempPassword.password);
                toast.success("Đã copy mật khẩu");
              }}
            >
              Copy
            </Button>
            <button
              onClick={() => setTempPassword(null)}
              aria-label="Đóng"
              className="flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-surface"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border-[1.5px] border-border bg-surface px-4 py-2.5">
          <span className="text-sm font-semibold text-text">
            Đã chọn {selected.length}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => doBulk("lock")}>
              Khoá
            </Button>
            <Button size="sm" variant="outline" onClick={() => doBulk("unlock")}>
              Mở
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmBulkDelete(true)}
            >
              Xoá
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Bảng */}
      <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="size-9 animate-pulse rounded-full bg-surface-alt" />
                <div className="h-4 flex-1 animate-pulse rounded bg-surface-alt" />
                <div className="h-4 w-24 animate-pulse rounded bg-surface-alt" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            {hasFilters ? (
              <EmptyState
                icon={<Search className="size-7" />}
                title="Không tìm thấy học sinh phù hợp"
                description="Thử đổi từ khoá hoặc xoá bớt bộ lọc."
                action={
                  <Button variant="outline" size="sm" onClick={() => router.replace("/teacher/students")}>
                    Xoá bộ lọc
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Users className="size-7" />}
                title="Chưa có học sinh nào"
                description="Thêm học sinh đơn lẻ hoặc import từ file Excel."
                action={
                  <Button size="sm" iconLeft={<UserPlus className="size-4" />} onClick={() => setFormOpen(true)}>
                    Thêm học sinh
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onCheckedChange={toggleAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="px-3 py-3 text-left font-semibold">Họ tên</th>
                <th className="px-3 py-3 text-left font-semibold">Email</th>
                <th className="hidden px-3 py-3 text-left font-semibold lg:table-cell">Lớp</th>
                <th className="hidden px-3 py-3 text-left font-semibold xl:table-cell">Ghi chú</th>
                <th className="px-3 py-3 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  className={
                    "border-t border-border transition-colors hover:bg-surface-alt " +
                    (highlightId === s.id ? "bg-brand-soft" : "") +
                    (trashedMode ? " opacity-60" : "")
                  }
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.includes(s.id)}
                      onCheckedChange={() => toggleOne(s.id)}
                      aria-label={`Chọn ${s.name}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {s.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                      ) : (
                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="font-medium text-text">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-text-secondary">{s.email}</td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(s.classrooms ?? []).slice(0, 2).map((c) => (
                        <StatusBadge key={c.id} tone="info">
                          {c.name}
                        </StatusBadge>
                      ))}
                      {(s.classrooms?.length ?? 0) > 2 && (
                        <StatusBadge tone="neutral">+{s.classrooms!.length - 2}</StatusBadge>
                      )}
                    </div>
                  </td>
                  <td className="hidden max-w-[200px] truncate px-3 py-3 text-text-muted xl:table-cell">
                    {s.note || "—"}
                  </td>
                  <td className="px-3 py-3">
                    {trashedMode ? (
                      <StatusBadge tone="danger">Đã xoá</StatusBadge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={() => toggleStatus(s)}
                          aria-label="Bật/tắt tài khoản"
                        />
                        <span className="text-xs text-text-muted">
                          {s.is_active ? "Hoạt động" : "Khoá"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {trashedMode ? (
                        <>
                          <IconBtn label="Phục hồi" onClick={() => doRestore(s)}>
                            <RotateCcw className="size-4" />
                          </IconBtn>
                          <IconBtn label="Xoá hẳn" danger onClick={() => setConfirmForce(s)}>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        </>
                      ) : (
                        <>
                          <IconBtn label="Đặt lại mật khẩu" onClick={() => doResetPassword(s)}>
                            <KeyRound className="size-4" />
                          </IconBtn>
                          <IconBtn
                            label="Sửa"
                            onClick={() => {
                              setEditing(s);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </IconBtn>
                          <IconBtn label="Xoá" danger onClick={() => setConfirmDelete(s)}>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Phân trang */}
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

      {/* Modals */}
      <StudentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        classrooms={classrooms}
        onCreated={onCreated}
        onUpdated={() => load()}
      />
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) return doDelete(confirmDelete);
        }}
        title="Xoá học sinh?"
        danger
        confirmLabel="Chuyển vào thùng rác"
        description={
          confirmDelete ? (
            <>
              Xoá <b>{confirmDelete.name}</b>?{" "}
              {(confirmDelete.in_progress_attempts_count ?? 0) > 0 && (
                <>
                  Học sinh đang có {confirmDelete.in_progress_attempts_count} bài làm dở —
                  dữ liệu bài làm vẫn được giữ.{" "}
                </>
              )}
              Có thể phục hồi từ thùng rác.
            </>
          ) : null
        }
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => doBulk("delete")}
        title={`Xoá ${selected.length} học sinh?`}
        danger
        confirmLabel="Xoá"
        requireText={String(selected.length)}
        requireTextHint={`Gõ số "${selected.length}" để xác nhận xoá:`}
        description="Các học sinh đã chọn sẽ được chuyển vào thùng rác (có thể phục hồi)."
      />

      <ConfirmDialog
        open={!!confirmForce}
        onClose={() => setConfirmForce(null)}
        onConfirm={() => {
          if (confirmForce) return doForceDelete(confirmForce);
        }}
        title="Xoá vĩnh viễn?"
        danger
        confirmLabel="Xoá vĩnh viễn"
        requireText="XOA"
        requireTextHint='Gõ "XOA" để xác nhận. Hành động này KHÔNG thể hoàn tác:'
        description={confirmForce ? `Xoá vĩnh viễn ${confirmForce.name}.` : null}
      />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}>
      <StudentsView />
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
