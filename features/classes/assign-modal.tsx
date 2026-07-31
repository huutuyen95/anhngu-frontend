"use client";

import { useEffect, useState } from "react";
import { Search, Check } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { createAssignment, listAssignableContent } from "@/lib/api/class-detail";
import type { AssignableItem, ClassSession } from "@/lib/types/classroom";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const TYPES = [
  { key: "test", label: "Đề thi" },
  { key: "writing", label: "Writing" },
  { key: "deck", label: "Từ vựng" },
];

type Selected = { type: string; id: number; title: string };

export function AssignModal({
  open,
  onClose,
  classId,
  session,
  studentCount,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  classId: number;
  session: ClassSession | null;
  studentCount: number;
  onAssigned: () => void;
}) {
  const [type, setType] = useState("test");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AssignableItem[]>([]);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [attempts, setAttempts] = useState(1);
  const [schedule, setSchedule] = useState<"now" | "at" | "draft">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setSchedule("now");
      setDueDate("");
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listAssignableContent(type, q).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [open, type, q]);

  function toggle(it: AssignableItem) {
    setSelected((prev) =>
      prev.some((s) => s.type === it.type && s.id === it.id)
        ? prev.filter((s) => !(s.type === it.type && s.id === it.id))
        : [...prev, { type: it.type, id: it.id, title: it.title }],
    );
  }
  const isSel = (it: AssignableItem) => selected.some((s) => s.type === it.type && s.id === it.id);

  const hasWriting = selected.some((s) => s.type === "writing");

  async function submit() {
    if (!session || selected.length === 0) return;
    setSaving(true);
    try {
      const res = await createAssignment({
        classroom_id: classId,
        class_session_id: session.id,
        items: selected.map((s) => ({ type: s.type, id: s.id })),
        due_date: dueDate || null,
        attempts_allowed: attempts,
        schedule,
        scheduled_at: schedule === "at" ? scheduledAt : null,
        notify,
      });
      let msg = `Đã giao ${res.created} lượt cho ${res.students_targeted} học sinh`;
      if (res.notified) msg += ` · ${res.notified} thông báo đã gửi`;
      toast.success(msg);
      if (res.excluded_locked) toast.warning(`${res.excluded_locked} học sinh đã khoá — không nhận bài.`);
      if (res.duplicates) toast.warning(`${res.duplicates} lượt đã được giao trước đó (bỏ qua).`);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Giao bài thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Giao bài"
      description={session ? `Buổi: ${session.title}` : "Chọn buổi trước"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} loading={saving} disabled={selected.length === 0 || !session}>
            Giao cho {studentCount} học viên
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chọn nội dung */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  type === t.key ? "bg-brand text-white" : "bg-surface-alt text-text-secondary hover:bg-brand-soft"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm nội dung…" className="h-10 pl-9" />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-muted">Không có nội dung.</p>
            ) : (
              items.map((it) => (
                <button
                  key={`${it.type}-${it.id}`}
                  onClick={() => toggle(it)}
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left last:border-0 transition-colors",
                    isSel(it) ? "bg-brand-soft" : "hover:bg-surface-alt"
                  )}
                >
                  <span className={cn("flex size-5 items-center justify-center rounded-md border-[1.5px]", isSel(it) ? "border-brand bg-brand text-white" : "border-border-strong")}>
                    {isSel(it) && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{it.title}</p>
                    <p className="text-xs text-text-muted">{it.meta}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <p className="text-xs text-text-secondary">Đã chọn {selected.length} nội dung</p>
        </div>

        {/* Cấu hình */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-semibold text-text">Hạn hoàn thành</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 h-10" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text">Số lần làm</label>
            <Input type="number" min={1} value={attempts} onChange={(e) => setAttempts(Math.max(1, Number(e.target.value)))} className="mt-1 h-10" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-text">Lịch giao</label>
            <div className="flex gap-1.5">
              {([["now", "Giao ngay"], ["at", "Lên lịch"], ["draft", "Nháp"]] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setSchedule(k)}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors",
                    schedule === k ? "bg-brand text-white" : "bg-surface-alt text-text-secondary hover:bg-brand-soft"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {schedule === "at" && (
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="h-10" />
          )}
          <Checkbox checked={notify} onCheckedChange={setNotify} label="Gửi thông báo cho học sinh" />
          {hasWriting && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
              Đề Writing sẽ vào hàng <b>Chờ chấm</b> sau khi học sinh nộp.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
