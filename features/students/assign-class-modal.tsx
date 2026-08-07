"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { bulkStudents } from "@/lib/api/students";
import type { ClassroomRef } from "@/lib/types/student";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** A2class — đổi lớp cho nhiều học sinh (add: giữ lớp cũ / move: gỡ lớp cũ). */
export function AssignClassModal({ open, onClose, ids, classrooms, onDone }: {
  open: boolean;
  onClose: () => void;
  ids: number[];
  classrooms: ClassroomRef[];
  onDone: () => void;
}) {
  const [classId, setClassId] = useState<number | null>(null);
  const [mode, setMode] = useState<"add" | "move">("add");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setClassId(classrooms[0]?.id ?? null); setMode("add"); }
  }, [open, classrooms]);

  async function save() {
    if (!classId) { toast.error("Chọn lớp đích."); return; }
    setBusy(true);
    try {
      const { affected } = await bulkStudents({ action: "assign_class", ids, classroom_id: classId, mode });
      toast.success(`Đã đổi lớp cho ${affected} học sinh.`);
      onDone();
    } catch { toast.error("Không đổi được lớp."); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Đổi lớp"
      description={`${ids.length} học sinh đã chọn`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Huỷ</Button>
        <Button onClick={save} loading={busy}>Áp dụng</Button>
      </>}>
      <label className="block">
        <span className="text-xs font-bold uppercase text-text-muted">Lớp đích</span>
        <Select block wrapClassName="mt-1" value={classId ?? ""} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}>
          <option value="" disabled>— Chọn lớp —</option>
          {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </label>

      <div className="mt-4 flex flex-col gap-2">
        {([["add", "Thêm vào lớp", "Giữ nguyên các lớp hiện tại của học sinh"], ["move", "Chuyển sang lớp này", "Gỡ khỏi các lớp cũ, chỉ còn lớp đích"]] as const).map(([m, label, desc]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn("flex items-start gap-3 rounded-xl border-[1.5px] p-3 text-left transition-colors", mode === m ? "border-brand bg-brand-soft/50" : "border-border hover:bg-surface-alt")}>
            <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]", mode === m ? "border-brand" : "border-border-strong")}>
              {mode === m && <span className="size-2.5 rounded-full bg-brand" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-text">{label}</span>
              <span className="block text-xs text-text-muted">{desc}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-text-muted">Nhiệm vụ ở lớp cũ vẫn được giữ nguyên, không bị huỷ.</p>
    </Modal>
  );
}
