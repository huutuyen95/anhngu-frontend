"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { createStudent, updateStudent } from "@/lib/api/students";
import type { ClassroomRef, Student } from "@/lib/types/student";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  open: boolean;
  onClose: () => void;
  editing: Student | null;
  classrooms: ClassroomRef[];
  onCreated: (student: Student, tempPassword: string) => void;
  onUpdated: (student: Student) => void;
};

export function StudentFormModal({
  open,
  onClose,
  editing,
  classrooms,
  onCreated,
  onUpdated,
}: Props) {
  const isEdit = !!editing;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [classIds, setClassIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(editing?.name ?? "");
    setEmail(editing?.email ?? "");
    setPhone(editing?.phone ?? "");
    setNote(editing?.note ?? "");
    setClassIds(editing?.classrooms?.map((c) => c.id) ?? []);
  }, [open, editing]);

  function toggleClass(id: number) {
    setClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      if (isEdit && editing) {
        const { student } = await updateStudent(editing.id, {
          name,
          phone,
          note,
          classroom_ids: classIds,
        });
        onUpdated(student);
      } else {
        const { student, temp_password } = await createStudent({
          name,
          email,
          phone,
          note,
          classroom_ids: classIds,
        });
        onCreated(student, temp_password);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
        setErrors(mapped);
      } else if (err instanceof ApiError) {
        setErrors({ _: err.message });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa học sinh" : "Thêm học sinh"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="student-form" loading={saving}>
            {isEdit ? "Lưu thay đổi" : "Tạo học sinh"}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {errors._ && (
          <div className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {errors._}
          </div>
        )}
        <FormField htmlFor="s-name" label="Họ tên" required error={errors.name}>
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>

        <FormField
          htmlFor="s-email"
          label="Email"
          required
          error={errors.email}
          hint={isEdit ? "Email là tên đăng nhập, không thể đổi." : undefined}
        >
          <Input
            id="s-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEdit}
            required
          />
        </FormField>

        <FormField htmlFor="s-phone" label="Số điện thoại" error={errors.phone}>
          <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>

        <FormField htmlFor="s-note" label="Ghi chú" error={errors.note}>
          <textarea
            id="s-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
          />
        </FormField>

        {classrooms.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text">Lớp học</span>
            <div className="flex flex-wrap gap-3 rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
              {classrooms.map((c) => (
                <Checkbox
                  key={c.id}
                  checked={classIds.includes(c.id)}
                  onCheckedChange={() => toggleClass(c.id)}
                  label={c.name}
                />
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
