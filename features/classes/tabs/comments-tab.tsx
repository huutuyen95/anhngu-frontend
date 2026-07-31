"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Download, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/api";
import { listSessions } from "@/lib/api/class-detail";
import { attendanceExportUrl, getAttendances, saveAttendances } from "@/lib/api/attendance";
import type { AttendanceRow, ClassSession } from "@/lib/types/classroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const STATUS = [
  { key: "on_time", label: "Đúng giờ", tone: "success" },
  { key: "late", label: "Muộn", tone: "warning" },
  { key: "absent", label: "Nghỉ", tone: "danger" },
] as const;

const CHIP_ACTIVE: Record<string, string> = {
  on_time: "bg-success text-white",
  late: "bg-warning text-white",
  absent: "bg-danger text-white",
};

export function CommentsTab({ classId }: { classId: number }) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSessions(classId)
      .then((r) => {
        setSessions(r.data);
        setActiveId(r.data[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const loadRows = useCallback(() => {
    if (!activeId) return;
    getAttendances(activeId).then((r) => setRows(r.data)).catch(() => setRows([]));
  }, [activeId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function setRow(userId: number, patch: Partial<AttendanceRow>) {
    setRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, ...patch } : r)));
  }

  function markAll() {
    setRows((prev) => prev.map((r) => ({ ...r, status: "on_time" })));
    toast.success("Đã đặt tất cả: Đúng giờ", { action: { label: "Hoàn tác", onClick: loadRows } });
  }

  async function save() {
    if (!activeId) return;
    setSaving(true);
    try {
      const items = rows
        .filter((r) => r.status)
        .map((r) => ({ user_id: r.user_id, status: r.status as string, comment: r.comment }));
      const { saved } = await saveAttendances(activeId, items);
      toast.success(`Đã lưu điểm danh ${saved} học viên.`);
    } catch {
      toast.error("Chưa lưu được, chữ cô gõ vẫn được giữ. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  const marked = rows.filter((r) => r.status).length;

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-surface-alt" />;
  if (sessions.length === 0)
    return <EmptyState title="Chưa có buổi học" description="Tạo buổi ở tab Giao bài trước khi điểm danh." />;

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <aside className="flex flex-col gap-2">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={cn(
              "rounded-xl border-[1.5px] p-2.5 text-left text-sm font-semibold transition-colors",
              activeId === s.id ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-text hover:bg-surface-alt"
            )}
          >
            {s.title}
          </button>
        ))}
      </aside>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm học viên…" className="h-10 pl-9" />
          </div>
          <Button variant="outline" size="sm" iconLeft={<CheckCheck className="size-4" />} onClick={markAll}>
            Tất cả đúng giờ
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Download className="size-4" />}
            onClick={() =>
              activeId &&
              downloadFile(attendanceExportUrl(activeId), `nhan-xet-buoi-${activeId}.xlsx`).catch(() =>
                toast.error("Không tải được file."),
              )
            }
          >
            Tải nhận xét
          </Button>
          <Button size="sm" onClick={save} loading={saving}>Lưu ({marked}/{rows.length})</Button>
        </div>

        <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Học viên</th>
                <th className="px-3 py-3 text-left font-semibold">Điểm danh</th>
                <th className="px-3 py-3 text-left font-semibold">Nhận xét</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-text">{r.name}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {STATUS.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setRow(r.user_id, { status: s.key })}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                            r.status === s.key ? CHIP_ACTIVE[s.key] : "border border-border text-text-secondary hover:bg-surface-alt"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      value={r.comment}
                      onChange={(e) => setRow(r.user_id, { comment: e.target.value })}
                      maxLength={500}
                      placeholder={r.status === "absent" ? "Em nghỉ buổi này, cô nhắc bài…" : "Nhận xét…"}
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
