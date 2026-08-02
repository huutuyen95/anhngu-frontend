"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { listDocCategories, syncDocCategories } from "@/lib/api/documents";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Row = { key: string; id: number | null; name: string; count: number };
let uid = 0;

export function CategoryManagerModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [deleted, setDeleted] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!open) return;
    setDeleted([]);
    listDocCategories().then((r) => setRows(r.data.map((c) => ({ key: `c${++uid}`, id: c.id, name: c.name, count: c.documents_count }))));
  }, [open]);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  }

  function remove(row: Row) {
    if (row.id && row.count > 0) { setConfirmRow(row); return; }
    doRemove(row);
  }
  function doRemove(row: Row) {
    if (row.id) setDeleted((d) => [...d, row.id!]);
    setRows((r) => r.filter((x) => x.key !== row.key));
    setConfirmRow(null);
  }

  async function save() {
    setSaving(true);
    try {
      const { moved_count } = await syncDocCategories({
        categories: rows.map((r, i) => ({ id: r.id, name: r.name.trim(), order: i + 1 })),
        deleted_ids: deleted,
      });
      toast.success(moved_count ? `Đã lưu · dồn ${moved_count} nội dung về "Chưa phân loại".` : "Đã lưu danh mục.");
      onSaved();
      onClose();
    } catch { toast.error("Không lưu được danh mục."); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Quản lý danh mục"
      footer={<>
        <Button variant="outline" iconLeft={<Plus className="size-4" />} className="mr-auto" onClick={() => setRows((r) => [...r, { key: `c${++uid}`, id: null, name: "Danh mục mới", count: 0 }])}>Thêm danh mục</Button>
        <Button onClick={save} loading={saving}>Lưu</Button>
      </>}>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={r.key} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
            <span className="w-5 text-center text-xs text-text-muted">{i + 1}</span>
            <Input value={r.name} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))} className="h-9 flex-1" />
            <span className="w-16 text-center text-xs text-text-muted">{r.count} mục</span>
            <button onClick={() => remove(r)} aria-label="Xoá danh mục" className="flex size-8 items-center justify-center rounded-lg border border-danger/40 text-danger hover:bg-danger-soft"><Trash2 className="size-4" /></button>
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Lên" className="text-text-muted hover:text-brand disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Xuống" className="text-text-muted hover:text-brand disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-sm text-text-muted">Chưa có danh mục — bấm Thêm danh mục.</p>}
      </div>

      <ConfirmDialog open={!!confirmRow} onClose={() => setConfirmRow(null)}
        onConfirm={() => { if (confirmRow) doRemove(confirmRow); }}
        title="Xoá danh mục?" danger confirmLabel="Vẫn xoá"
        description={confirmRow ? `Danh mục "${confirmRow.name}" có ${confirmRow.count} nội dung — sẽ dồn về "Chưa phân loại" khi bạn bấm Lưu.` : null} />
    </Modal>
  );
}
