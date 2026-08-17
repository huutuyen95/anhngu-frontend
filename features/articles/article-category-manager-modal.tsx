"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listArticleCategories, syncArticleCategories } from "@/lib/api/articles";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Row = { key: string; id: number | null; name: string; count: number };
let rowId = 0;

export function ArticleCategoryManagerModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!open) return;
    listArticleCategories()
      .then((response) => {
        setDeletedIds([]);
        setRows(response.data.map((category) => ({
          key: `article-category-${++rowId}`,
          id: category.id,
          name: category.name,
          count: category.articles_count ?? 0,
        })));
      })
      .catch(() => toast.error("Không tải được danh mục bài viết."));
  }, [open]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  }

  function remove(row: Row) {
    if (row.count > 0) {
      setConfirmRow(row);
      return;
    }
    doRemove(row);
  }

  function doRemove(row: Row) {
    if (row.id) setDeletedIds((current) => [...current, row.id!]);
    setRows((current) => current.filter((item) => item.key !== row.key));
    setConfirmRow(null);
  }

  async function save() {
    if (rows.some((row) => !row.name.trim())) {
      toast.error("Tên danh mục không được để trống.");
      return;
    }
    setSaving(true);
    try {
      await syncArticleCategories({
        categories: rows.map((row, index) => ({ id: row.id, name: row.name.trim(), order: index + 1 })),
        deleted_ids: deletedIds,
      });
      toast.success("Đã lưu danh mục bài viết.");
      onSaved();
      onClose();
    } catch {
      toast.error("Không lưu được danh mục bài viết.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quản lý danh mục bài viết"
      footer={(
        <>
          <Button
            variant="outline"
            iconLeft={<Plus className="size-4" />}
            className="mr-auto"
            onClick={() => setRows((current) => [...current, { key: `article-category-${++rowId}`, id: null, name: "Danh mục mới", count: 0 }])}
          >
            Thêm danh mục
          </Button>
          <Button onClick={save} loading={saving}>Lưu</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
            <span className="w-5 text-center text-xs text-text-muted">{index + 1}</span>
            <Input value={row.name} onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, name: event.target.value } : item))} className="h-9 flex-1" />
            <span className="w-16 text-center text-xs text-text-muted">{row.count} bài</span>
            <button type="button" onClick={() => remove(row)} aria-label="Xoá danh mục" className="flex size-8 items-center justify-center rounded-lg border border-danger/40 text-danger hover:bg-danger-soft">
              <Trash2 className="size-4" />
            </button>
            <div className="flex flex-col">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Đưa lên" className="text-text-muted hover:text-brand disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label="Đưa xuống" className="text-text-muted hover:text-brand disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={() => { if (confirmRow) doRemove(confirmRow); }}
        title="Xoá danh mục?"
        danger
        confirmLabel="Vẫn xoá"
        description={confirmRow ? `${confirmRow.count} bài viết trong “${confirmRow.name}” sẽ chuyển thành chưa phân loại.` : null}
      />
    </Modal>
  );
}
