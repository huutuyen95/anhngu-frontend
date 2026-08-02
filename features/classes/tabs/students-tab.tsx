"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, UserPlus, KeyRound, Trash2, Copy, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  addClassStudents,
  listClassStudents,
  quickCreateClassStudent,
  removeClassStudent,
} from "@/lib/api/class-detail";
import { listStudents, resetStudentPassword } from "@/lib/api/students";
import type { Student } from "@/lib/types/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export function StudentsTab({ classId, onChanged }: { classId: number; onChanged: () => void }) {
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [addMenu, setAddMenu] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempPw, setTempPw] = useState<{ email: string; password: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Student | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listClassStudents(classId)
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function doReset(s: Student) {
    const { temp_password } = await resetStudentPassword(s.id);
    setTempPw({ email: s.email, password: temp_password });
  }

  async function doRemove(s: Student) {
    await removeClassStudent(classId, s.id);
    setConfirmRemove(null);
    toast.success("Đã gỡ học viên khỏi lớp.");
    load();
    onChanged();
  }

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.email.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div onClick={() => setAddMenu(false)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm học viên trong lớp…" className="pl-10" />
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <Button iconLeft={<UserPlus className="size-4" />} onClick={() => setAddMenu((v) => !v)}>
            Thêm học viên
          </Button>
          {addMenu && (
            <div className="absolute right-0 top-12 z-10 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
              <button onClick={() => { setQuickOpen(true); setAddMenu(false); }} className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-alt">
                Tạo nhanh
              </button>
              <button onClick={() => { setPickerOpen(true); setAddMenu(false); }} className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-alt">
                Chọn từ danh sách có sẵn
              </button>
            </div>
          )}
        </div>
      </div>

      {tempPw && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-brand/40 bg-brand-soft px-4 py-3">
          <p className="text-sm text-text">
            Mật khẩu tạm cho <b>{tempPw.email}</b> (hiện 1 lần):
            <code className="ml-2 rounded-md bg-surface px-2 py-0.5 font-mono text-brand-bold">{tempPw.password}</code>
          </p>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" iconLeft={<Copy className="size-4" />} onClick={() => { navigator.clipboard.writeText(tempPw.password); toast.success("Đã copy"); }}>
              Copy
            </Button>
            <button onClick={() => setTempPw(null)} aria-label="Đóng" className="flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-surface">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
        {loading ? (
          <div className="p-6 text-center text-sm text-text-muted">Đang tải…</div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<UserPlus className="size-7" />}
              title="Lớp chưa có học viên"
              description="Thêm học viên đầu tiên vào lớp."
              action={<Button size="sm" onClick={() => setQuickOpen(true)}>Thêm học viên</Button>}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Họ tên</th>
                <th className="px-3 py-3 text-left font-semibold">Email</th>
                <th className="px-3 py-3 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-surface-alt">
                  <td className="px-4 py-3">
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
                  <td className="px-3 py-3">
                    <span className={cn("text-xs font-semibold", s.is_active ? "text-success" : "text-danger")}>
                      {s.is_active ? "Hoạt động" : "Khoá"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => doReset(s)} title="Đặt lại mật khẩu" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-text">
                        <KeyRound className="size-4" />
                      </button>
                      <button onClick={() => setConfirmRemove(s)} title="Gỡ khỏi lớp" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <QuickCreateModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        classId={classId}
        onCreated={(email, pw) => { setTempPw({ email, password: pw }); load(); onChanged(); }}
      />
      <StudentPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        classId={classId}
        existingIds={rows.map((r) => r.id)}
        onAdded={() => { load(); onChanged(); }}
      />

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => { if (confirmRemove) return doRemove(confirmRemove); }}
        title="Gỡ học viên khỏi lớp?"
        danger
        confirmLabel="Gỡ khỏi lớp"
        description={confirmRemove ? `Chỉ gỡ ${confirmRemove.name} khỏi lớp — tài khoản vẫn còn. Bài đang làm vẫn được giữ.` : null}
      />
    </div>
  );
}

function QuickCreateModal({ open, onClose, classId, onCreated }: {
  open: boolean; onClose: () => void; classId: number; onCreated: (email: string, pw: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(""); setEmail(""); setErrors({}); } }, [open]);

  async function submit(again: boolean) {
    setErrors({});
    setSaving(true);
    try {
      const { temp_password } = await quickCreateClassStudent(classId, { name, email });
      onCreated(email, temp_password);
      if (again) { setName(""); setEmail(""); } else onClose();
    } catch (err) {
      const e = err as { errors?: Record<string, string[]> };
      if (e.errors) { const m: Record<string, string> = {}; for (const [k, v] of Object.entries(e.errors)) m[k] = v[0]; setErrors(m); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo nhanh học viên"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button variant="ghost" onClick={() => submit(true)} loading={saving}>Lưu & thêm tiếp</Button>
          <Button onClick={() => submit(false)} loading={saving}>Lưu</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField htmlFor="q-name" label="Họ tên" required error={errors.name}>
          <Input id="q-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField htmlFor="q-email" label="Email" required error={errors.email}>
          <Input id="q-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <p className="text-xs text-text-muted">Mật khẩu tạm sẽ tự sinh và hiện sau khi lưu.</p>
      </div>
    </Modal>
  );
}

function StudentPickerModal({ open, onClose, classId, existingIds, onAdded }: {
  open: boolean; onClose: () => void; classId: number; existingIds: number[]; onAdded: () => void;
}) {
  const [all, setAll] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setPicked([]); setQ(""); return; }
    listStudents({ q, per_page: "50" }).then((r) => setAll(r.data)).catch(() => setAll([]));
  }, [open, q]);

  async function add() {
    if (picked.length === 0) return;
    setSaving(true);
    try {
      const { added } = await addClassStudents(classId, picked);
      toast.success(`Đã thêm ${added} học viên vào lớp.`);
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chọn học viên có sẵn"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={add} loading={saving} disabled={picked.length === 0}>Thêm {picked.length} học viên</Button>
        </>
      }
    >
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm học viên…" className="mb-3 h-10" />
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
        {all.map((s) => {
          const inClass = existingIds.includes(s.id);
          const sel = picked.includes(s.id);
          return (
            <button
              key={s.id}
              disabled={inClass}
              onClick={() => setPicked((p) => (sel ? p.filter((x) => x !== s.id) : [...p, s.id]))}
              title={inClass ? "Đã ở trong lớp" : undefined}
              className={cn(
                "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left last:border-0",
                inClass ? "cursor-not-allowed opacity-50" : sel ? "bg-brand-soft" : "hover:bg-surface-alt"
              )}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-md border-[1.5px]", sel ? "border-brand bg-brand text-white" : "border-border-strong")}>
                {sel && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{s.name}</p>
                <p className="text-xs text-text-muted">{s.email}</p>
              </div>
              {inClass && <span className="text-xs text-text-muted">Đã ở lớp</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
