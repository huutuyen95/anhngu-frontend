"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listAllTestFolders, moveTestCategory } from "@/lib/api/tests";
import { TEST_GROUPS, type TestGroup } from "@/lib/types/test";
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
  const [folders, setFolders] = useState<{ id: number; name: string; group: TestGroup }[]>([]);
  const [folderId, setFolderId] = useState<number | null>(test?.category_id ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFolderId(test?.category_id ?? null);
    listAllTestFolders().then(setFolders).catch(() => setFolders([]));
  }, [open, test]);

  const byGroup = useMemo(
    () => TEST_GROUPS.map((g) => ({ ...g, items: folders.filter((f) => f.group === g.key) })),
    [folders],
  );

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
        <span className="text-xs font-bold uppercase text-text-muted">Thư mục</span>
        <Select block wrapClassName="mt-1" value={folderId ?? ""} onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">— Chưa phân loại —</option>
          {byGroup.map((g) => (
            <optgroup key={g.key} label={g.label}>
              {g.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </optgroup>
          ))}
        </Select>
      </label>
    </Modal>
  );
}
