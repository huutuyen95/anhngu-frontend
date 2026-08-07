"use client";

import { Mail, Phone, StickyNote, GraduationCap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Student } from "@/lib/types/student";

/** Xem chi tiết học sinh (read-only) — mở khi click vào hàng. */
export function StudentDetailModal({ student, open, onClose }: { student: Student | null; open: boolean; onClose: () => void }) {
  if (!student) return null;

  return (
    <Modal open={open} onClose={onClose} title="Thông tin học sinh">
      <div className="flex items-center gap-3">
        {student.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={student.avatar_url} alt="" className="size-14 rounded-full object-cover" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand">{student.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-text">{student.name}</p>
          {student.is_active
            ? <StatusBadge tone="success">Đang hoạt động</StatusBadge>
            : <StatusBadge tone="danger">Đã khoá</StatusBadge>}
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <Row icon={<Mail className="size-4" />} label="Email">{student.email}</Row>
        <Row icon={<Phone className="size-4" />} label="Số điện thoại">{student.phone || "—"}</Row>
        <Row icon={<GraduationCap className="size-4" />} label="Lớp học">
          {student.classrooms && student.classrooms.length > 0 ? (
            <span className="flex flex-wrap gap-1">{student.classrooms.map((c) => <StatusBadge key={c.id} tone="info">{c.name}</StatusBadge>)}</span>
          ) : "Chưa vào lớp nào"}
        </Row>
        <Row icon={<StickyNote className="size-4" />} label="Ghi chú">{student.note || "—"}</Row>
      </dl>

      {(student.in_progress_attempts_count ?? 0) > 0 && (
        <p className="mt-4 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-text-secondary">Đang có <b className="text-text">{student.in_progress_attempts_count}</b> bài làm dở.</p>
      )}
    </Modal>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
        <dd className="text-text">{children}</dd>
      </div>
    </div>
  );
}
