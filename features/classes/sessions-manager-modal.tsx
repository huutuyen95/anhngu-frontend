"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, GripVertical, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { listSessions, syncSessions } from "@/lib/api/class-detail";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  id: number | null;
  title: string;
  is_visible: boolean;
  items_count: number;
  total: number;
  done: number;
};

let uid = 0;
const nextKey = () => `r${++uid}`;

export function SessionsManagerModal({
  open,
  onClose,
  classId,
  className,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  classId: number;
  className: string;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [forceIds, setForceIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setDeletedIds([]);
    setForceIds([]);
    setErrors({});
    setDirty(false);
    listSessions(classId)
      .then((r) =>
        setRows(
          r.data.map((s) => ({
            key: nextKey(),
            id: s.id,
            title: s.title,
            is_visible: s.is_visible,
            items_count: s.items_count,
            total: s.total,
            done: s.done,
          })),
        ),
      )
      .finally(() => setLoading(false));
  }, [open, classId]);

  function mutate(fn: (r: Row[]) => Row[]) {
    setRows(fn);
    setDirty(true);
  }

  function addRow() {
    const n = rows.length + 1;
    const key = nextKey();
    mutate((r) => [...r, { key, id: null, title: `Buổi ${n} — `, is_visible: true, items_count: 0, total: 0, done: 0 }]);
    setTimeout(() => {
      const el = document.getElementById(`sess-input-${key}`) as HTMLInputElement | null;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
    }, 30);
  }

  function requestRemove(row: Row) {
    const hasContent = (row.items_count ?? 0) > 0 || (row.total ?? 0) > 0;
    if (row.id && hasContent) {
      setConfirmDel(row);
    } else {
      doRemove(row, false);
    }
  }

  function doRemove(row: Row, force: boolean) {
    if (row.id) {
      setDeletedIds((p) => [...p, row.id!]);
      if (force) setForceIds((p) => [...p, row.id!]);
    }
    mutate((r) => r.filter((x) => x.key !== row.key));
    setConfirmDel(null);
    toast.success("Đã xoá khỏi danh sách (chưa lưu).");
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length) return;
    mutate((r) => {
      const next = [...r];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function save(extraForce: number[] = []) {
    setErrors({});
    setSaving(true);
    try {
      const res = await syncSessions(classId, {
        sessions: rows.map((r) => ({ id: r.id, title: r.title.trim(), is_visible: r.is_visible })),
        deleted_ids: deletedIds,
        force_delete_ids: [...forceIds, ...extraForce],
      });
      toast.success(`Đã cập nhật tiến trình · thêm ${res.created}, sửa ${res.updated}, xoá ${res.deleted}.`);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Có buổi bị chặn xoá (còn nội dung). UI đã confirm ở bước xoá; ở đây force lại
        // toàn bộ buổi đã xoá rồi lưu lần nữa để chắc chắn.
        if (extraForce.length === 0) {
          await save(deletedIds);
        } else {
          toast.error("Không xoá được tiến trình. Thử lại sau.");
        }
      } else if (err instanceof ApiError && err.status === 422 && err.errors) {
        const map: Record<number, string> = {};
        for (const [k, v] of Object.entries(err.errors)) {
          const m = k.match(/sessions\.(\d+)\.title/);
          if (m) map[Number(m[1])] = v[0];
        }
        setErrors(map);
        const firstIdx = Math.min(...Object.keys(map).map(Number));
        setTimeout(() => document.getElementById(`sess-row-${firstIdx}`)?.scrollIntoView({ block: "center" }), 30);
        toast.error("Có tên tiến trình chưa hợp lệ.");
      } else {
        toast.error("Chưa lưu được — thứ tự cô vừa sắp vẫn được giữ.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (dirty) setConfirmClose(true);
    else onClose();
  }

  const changeCount = deletedIds.length + (dirty ? rows.filter((r) => !r.id).length : 0);

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        size="lg"
        title="Thêm / Sửa Tiến Trình"
        description={`${className} · ${rows.length} tiến trình · kéo ⠿ hoặc dùng ↑/↓ để đổi thứ tự`}
        footer={
          <>
            <Button variant="outline" iconLeft={<Plus className="size-4" />} onClick={addRow} className="mr-auto">
              Thêm tiến trình mới
            </Button>
            {dirty && <span className="text-xs text-warning">{changeCount || "Có"} thay đổi chưa lưu</span>}
            <Button onClick={() => save()} loading={saving} disabled={rows.length === 0 && deletedIds.length === 0}>
              Lưu
            </Button>
          </>
        }
      >
        <div ref={bodyRef} className="max-h-[52vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-alt" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border py-10 text-center">
              <FolderOpen className="size-8 text-brand" />
              <p className="text-sm text-text-muted">
                Chưa có tiến trình — bấm <b>＋ Thêm tiến trình mới</b> để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border-[1.5px] border-border">
              {rows.map((row, i) => (
                <div
                  key={row.key}
                  id={`sess-row-${i}`}
                  draggable
                  onDragStart={() => (dragFrom.current = i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragFrom.current !== null) move(dragFrom.current, i); dragFrom.current = null; }}
                  className={cn(
                    "flex items-center gap-3 border-b border-border p-3 last:border-0",
                    errors[i] ? "bg-danger-soft" : "bg-surface"
                  )}
                >
                  <span className="w-6 shrink-0 text-center font-display text-sm font-bold text-text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      id={`sess-input-${row.key}`}
                      value={row.title}
                      onChange={(e) => mutate((r) => r.map((x) => (x.key === row.key ? { ...x, title: e.target.value } : x)))}
                      className={cn(
                        "w-full rounded-xl border-[1.5px] bg-surface-alt px-3 py-2 text-sm font-bold text-text outline-none transition-colors focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/30",
                        errors[i] ? "border-danger" : "border-border"
                      )}
                    />
                    <p className={cn("mt-1 text-xs", errors[i] ? "text-danger" : "text-text-muted")}>
                      {errors[i] ?? (row.total > 0 ? `${row.items_count} nội dung · ${row.done}/${row.total} hoàn thành` : "chưa có nội dung")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={row.is_visible}
                        onCheckedChange={(v) => mutate((r) => r.map((x) => (x.key === row.key ? { ...x, is_visible: v } : x)))}
                        aria-label={row.is_visible ? "Đang hiện" : "Đang ẩn"}
                      />
                      <span className={cn("w-7 text-xs font-semibold", row.is_visible ? "text-success" : "text-text-muted")}>
                        {row.is_visible ? "Hiện" : "Ẩn"}
                      </span>
                    </div>
                    <button
                      onClick={() => requestRemove(row)}
                      aria-label={`Xoá ${row.title}`}
                      className="flex size-8 items-center justify-center rounded-lg border border-danger/40 text-danger transition-colors hover:bg-danger-soft"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <button
                      aria-label={`Đổi thứ tự ${row.title} — dùng phím lên xuống`}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") { e.preventDefault(); move(i, i - 1); }
                        if (e.key === "ArrowDown") { e.preventDefault(); move(i, i + 1); }
                      }}
                      className="flex size-8 cursor-grab items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-alt"
                    >
                      <GripVertical className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-[11px] text-warning">
            Tắt “Hiện” thì học sinh không thấy tiến trình đó (bài đã giao vẫn giữ). Xoá tiến trình
            còn nội dung đã giao sẽ được hỏi lại số nhiệm vụ bị ảnh hưởng.
          </p>
          <div aria-live="polite" className="sr-only" />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) doRemove(confirmDel, true);
        }}
        title="Xoá tiến trình còn nội dung?"
        danger
        confirmLabel="Xoá tiến trình"
        description={
          confirmDel
            ? `Xoá "${confirmDel.title}"? Buổi này đang có ${confirmDel.items_count} nội dung và ${confirmDel.total} nhiệm vụ đã giao. Nhiệm vụ sẽ bị gỡ khỏi lộ trình của học sinh.`
            : null
        }
      />

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => { setConfirmClose(false); onClose(); }}
        title="Bỏ thay đổi?"
        danger
        confirmLabel="Bỏ thay đổi"
        description="Các thay đổi tiến trình chưa lưu sẽ bị mất."
      />
    </>
  );
}
