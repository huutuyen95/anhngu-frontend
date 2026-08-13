"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getSettingChanges, revertSettingChange } from "@/lib/api/settings";
import type { SettingChange } from "@/lib/types/setting";

export function SettingsHistoryModal({
  open,
  onClose,
  onReverted,
}: {
  open: boolean;
  onClose: () => void;
  onReverted: () => void;
}) {
  const [rows, setRows] = useState<SettingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getSettingChanges()
      .then((r) => !cancelled && setRows(r.data))
      .catch(() => !cancelled && toast.error("Không tải được lịch sử."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function revert(id: number) {
    try {
      await revertSettingChange(id);
      toast.success("Đã hoàn tác thay đổi.");
      const r = await getSettingChanges();
      setRows(r.data);
      onReverted();
    } catch {
      toast.error("Không hoàn tác được.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Lịch sử thay đổi" size="xl">
      <div className="max-h-[60vh] overflow-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-text-muted">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">Chưa có thay đổi nào.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-alt text-[11px] font-bold uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2.5">Thời điểm</th>
                <th className="px-3 py-2.5">Mục cấu hình</th>
                <th className="px-3 py-2.5">Giá trị cũ</th>
                <th className="px-3 py-2.5">Giá trị mới</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-text-muted">
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                    {r.changed_by && <div className="text-[11px]">{r.changed_by}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-text">{r.label}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.old_value ?? "—"}</td>
                  <td className="px-3 py-2.5 font-semibold text-text">{r.new_value ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {r.revertible && (
                      <button
                        type="button"
                        onClick={() => setConfirmId(r.id)}
                        className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-border px-2.5 py-1 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand"
                      >
                        <RotateCcw className="size-3" /> Hoàn tác
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={async () => {
          if (confirmId !== null) await revert(confirmId);
          setConfirmId(null);
        }}
        title="Hoàn tác thay đổi?"
        confirmLabel="Hoàn tác"
        description="Giá trị cấu hình sẽ quay lại như trước thay đổi này."
      />
    </Modal>
  );
}
