"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, FileText, BookA, Trash2, PenLine, Folder } from "lucide-react";
import { toast } from "sonner";
import {
  deleteSessionItem,
  listSessionItems,
  listSessions,
  updateSession,
} from "@/lib/api/class-detail";
import type { ClassSession, SessionItemRow } from "@/lib/types/classroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { AssignModal } from "@/features/classes/assign-modal";
import { SessionsManagerModal } from "@/features/classes/sessions-manager-modal";
import { cn } from "@/lib/utils";

export function AssignTab({
  classId,
  className,
  focusSession,
}: {
  classId: number;
  className: string;
  focusSession: number | null;
}) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [activeId, setActiveId] = useState<number | null>(focusSession);
  const [items, setItems] = useState<SessionItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(true);

  const active = sessions.find((s) => s.id === activeId) ?? null;

  const loadSessions = useCallback(() => {
    return listSessions(classId).then((r) => {
      setSessions(r.data);
      setActiveId((cur) => cur ?? focusSession ?? r.data[0]?.id ?? null);
      return r.data;
    });
  }, [classId, focusSession]);

  useEffect(() => {
    loadSessions().finally(() => setLoading(false));
  }, [loadSessions]);

  const loadItems = useCallback(() => {
    if (!activeId) return;
    listSessionItems(activeId).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [activeId]);

  useEffect(() => {
    loadItems();
    setNote(active?.note ?? "");
    setNoteSaved(true);
  }, [loadItems, active?.note]);

  async function saveNote() {
    if (!activeId || noteSaved) return;
    await updateSession(activeId, { note }).catch(() => toast.error("Chưa lưu được ghi chú."));
    setNoteSaved(true);
    setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, note } : s)));
  }

  async function removeItem(id: number) {
    await deleteSessionItem(id);
    toast.success("Đã gỡ nội dung.");
    loadItems();
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-surface-alt" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[236px_1fr]">
      {/* Rail tiến trình */}
      <aside className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Tiến trình học</span>
          <button
            onClick={() => setManagerOpen(true)}
            aria-label="Thêm / sửa tiến trình"
            title="Thêm / sửa tiến trình"
            className="relative flex size-[30px] items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand after:absolute after:-inset-2 after:content-['']"
          >
            <Folder className="size-5" strokeWidth={1.5} />
            <span className="absolute -bottom-px -right-px flex size-[13px] items-center justify-center rounded-full border-[1.5px] border-white bg-brand text-[9px] font-bold leading-none text-white">
              +
            </span>
          </button>
        </div>
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={cn(
              "rounded-xl border-[1.5px] p-3 text-left transition-colors",
              activeId === s.id ? "border-brand bg-brand-soft" : "border-border bg-surface hover:bg-surface-alt"
            )}
          >
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-sm font-semibold text-text">{s.title}</p>
              {!s.is_visible && <StatusBadge tone="neutral">Ẩn</StatusBadge>}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                <div className="h-full rounded-full bg-brand" style={{ width: `${s.progress_pct}%` }} />
              </div>
              <span className="text-[11px] text-text-muted">{s.done}/{s.total}</span>
            </div>
          </button>
        ))}
      </aside>

      {/* Khu chính */}
      <div className="flex flex-col gap-4">
        {!active ? (
          <EmptyState
            icon={<Plus className="size-7" />}
            title="Chưa có buổi học"
            description="Tạo buổi đầu tiên để giao nội dung cho lớp."
            action={<Button size="sm" onClick={() => setManagerOpen(true)}>Thêm tiến trình</Button>}
          />
        ) : (
          <>
            <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
              <h3 className="font-display text-lg font-bold text-text">{active.title}</h3>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-semibold text-text">Ghi chú cho học sinh</label>
                  <span className="text-xs text-text-muted" aria-live="polite">
                    {noteSaved ? "Đã lưu" : "Chưa lưu…"}
                  </span>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
                  onBlur={saveNote}
                  rows={2}
                  placeholder="Nhập ghi chú, dặn dò cho buổi này…"
                  className="w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                />
              </div>
            </div>

            <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-text">Đã giao ({items.length})</h3>
                <Button size="sm" iconLeft={<Plus className="size-4" />} onClick={() => setAssignOpen(true)}>
                  Giao bài
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-muted">Chưa giao nội dung nào cho buổi này.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        {it.type === "deck" ? <BookA className="size-4" /> : <FileText className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text">{it.title}</p>
                        <p className="text-xs text-text-muted">{it.meta}</p>
                      </div>
                      <StatusBadge tone={it.done === it.assigned && it.assigned > 0 ? "success" : "neutral"}>
                        {it.done}/{it.assigned} nộp
                      </StatusBadge>
                      {it.type === "writing" && (
                        <StatusBadge tone="warning">
                          <PenLine className="mr-1 inline size-3" />chờ chấm
                        </StatusBadge>
                      )}
                      <button
                        onClick={() => removeItem(it.id)}
                        aria-label="Gỡ khỏi buổi"
                        className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        classId={classId}
        session={active}
        studentCount={active?.student_count ?? 0}
        onAssigned={() => { loadItems(); loadSessions(); }}
      />

      <SessionsManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        classId={classId}
        className={className}
        onSaved={() => {
          loadSessions().then((data) => {
            // Buổi đang chọn bị xoá → chọn buổi còn lại gần nhất.
            if (activeId && !data.some((s) => s.id === activeId)) {
              setActiveId(data[0]?.id ?? null);
            }
          });
          loadItems();
        }}
      />
    </div>
  );
}
