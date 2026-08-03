"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listTestCategories, moveTestCategory } from "@/lib/api/tests";
import { listClassrooms } from "@/lib/api/classrooms";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Test } from "@/lib/types/test";

/** Chuyển một đề sang thư mục khác (A4menu → Chuyển thư mục). */
export function MoveTestModal({ test, open, onClose, onDone }: {
  test: Test | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [folders, setFolders] = useState<{ id: number; name: string }[]>([]);
  const [folderId, setFolderId] = useState<number | null>(test?.category_id ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFolderId(test?.category_id ?? null);
    listClassrooms().then((r) => setClasses(r.data.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, [open, test]);

  useEffect(() => {
    if (!open) return;
    listTestCategories(classId).then((r) => setFolders(r.data.map((c) => ({ id: c.id, name: c.name })))).catch(() => setFolders([]));
  }, [open, classId]);

  async function save() {
    if (!test) return;
    setBusy(true);
    try {
      await moveTestCategory(test.id, folderId);
      toast.success("Đã chuyển thư mục.");
      onDone();
    } catch { toast.error("Không chuyển được thư mục."); }
    finally { setBusy(false); }
  }

  if (!test) return null;

  return (
    <Modal open={open} onClose={onClose} title="Chuyển thư mục"
      description={`Đề: ${test.title}`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Huỷ</Button>
        <Button onClick={save} loading={busy}>Lưu</Button>
      </>}>
      <label className="block">
        <span className="text-xs font-bold uppercase text-text-muted">Lớp</span>
        <Select block wrapClassName="mt-1" value={classId ?? ""} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Dùng chung (không theo lớp)</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-bold uppercase text-text-muted">Thư mục</span>
        <Select block wrapClassName="mt-1" value={folderId ?? ""} onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">— Chưa phân loại —</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
      </label>
    </Modal>
  );
}
