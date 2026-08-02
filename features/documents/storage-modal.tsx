"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { bulkDeleteAttachments, getStorageUsage } from "@/lib/api/documents";
import { formatBytes, type StorageUsage } from "@/lib/types/document";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const TYPE_COLOR: Record<string, string> = { video: "bg-danger", document: "bg-brand", audio: "bg-warning", image: "bg-info" };
const TYPE_LABEL: Record<string, string> = { video: "Video", document: "Tài liệu", audio: "Audio", image: "Ảnh" };

export function StorageModal({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<StorageUsage | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => getStorageUsage().then(setData).catch(() => {});
  useEffect(() => { if (open) { setPicked([]); load(); } }, [open]);

  async function del() {
    if (picked.length === 0) return;
    setBusy(true);
    try {
      await bulkDeleteAttachments(picked);
      toast.success(`Đã xoá ${picked.length} file.`);
      setPicked([]);
      load();
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Quản lý dung lượng"
      footer={<Button variant="danger" onClick={del} loading={busy} disabled={picked.length === 0}>Xoá file đã chọn ({picked.length})</Button>}>
      {!data ? <p className="py-6 text-center text-sm text-text-muted">Đang tải…</p> : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-text">Đã dùng</span><span className="text-text-secondary">{formatBytes(data.total_bytes)} / {formatBytes(data.limit_bytes)}</span></div>
            <div className="flex h-4 overflow-hidden rounded-full bg-surface-alt">
              {data.by_type.map((t) => <div key={t.type} className={TYPE_COLOR[t.type] ?? "bg-brand"} style={{ width: `${(t.bytes / data.limit_bytes) * 100}%` }} title={`${TYPE_LABEL[t.type] ?? t.type}: ${formatBytes(t.bytes)}`} />)}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {data.by_type.map((t) => <span key={t.type} className="flex items-center gap-1"><span className={"size-2.5 rounded-full " + (TYPE_COLOR[t.type] ?? "bg-brand")} />{TYPE_LABEL[t.type] ?? t.type}: {formatBytes(t.bytes)}</span>)}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-text">File nặng nhất</p>
            {data.biggest.length === 0 ? <p className="text-sm text-text-muted">Chưa có file nào.</p> : (
              <div className="overflow-hidden rounded-xl border border-border">
                {data.biggest.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-3 border-b border-border p-2.5 last:border-0 hover:bg-surface-alt">
                    <Checkbox checked={picked.includes(f.id)} onCheckedChange={() => setPicked((p) => (p.includes(f.id) ? p.filter((x) => x !== f.id) : [...p, f.id]))} aria-label={`Chọn ${f.name}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{f.name}</p>
                      <p className="text-xs text-text-muted">{f.parent ?? "—"}</p>
                    </div>
                    <span className="text-xs font-semibold text-text-secondary">{formatBytes(f.size)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
