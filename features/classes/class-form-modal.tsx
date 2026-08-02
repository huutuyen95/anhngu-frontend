"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Upload, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createClassroom,
  listCoverPresets,
  updateClassroom,
  uploadCover,
} from "@/lib/api/classrooms";
import type { Classroom, CoverPreset } from "@/lib/types/classroom";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CoverThumb } from "@/components/teacher/cover-thumb";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  editing: Classroom | null;
  onSaved: (c: Classroom, opts: { goToStudents: boolean }) => void;
};

export function ClassFormModal({ open, onClose, editing, onSaved }: Props) {
  const isEdit = !!editing;
  const [name, setName] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [description, setDescription] = useState("");
  const [presets, setPresets] = useState<CoverPreset[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  // Ảnh cô đã tải lên — giữ độc lập với `cover` (ô đang chọn) để không mất khi chọn màu preset.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(editing?.name ?? "");
    const c = editing?.cover_url ?? null;
    setCover(c);
    setUploadedUrl(c && !c.startsWith("preset:") ? c : null);
    setStartsOn(editing?.starts_on ?? "");
    setEndsOn(editing?.ends_on ?? "");
    setDescription(editing?.description ?? "");
  }, [open, editing]);

  useEffect(() => {
    listCoverPresets().then((r) => setPresets(r.data)).catch(() => {});
  }, []);

  async function handleUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setErrors((e) => ({ ...e, cover: "Ảnh phải ≤ 2MB." }));
      return;
    }
    // Hiện ngay ảnh vừa chọn (trước cả khi upload xong).
    const local = URL.createObjectURL(file);
    setPendingPreview(local);
    setUploading(true);
    setErrors((e) => ({ ...e, cover: "" }));
    try {
      const { url } = await uploadCover(file);
      setUploadedUrl(url);
      setCover(url);
    } catch {
      setErrors((e) => ({ ...e, cover: "Tải ảnh thất bại." }));
    } finally {
      setUploading(false);
      URL.revokeObjectURL(local);
      setPendingPreview(null);
    }
  }

  function clearCover(e: React.MouseEvent) {
    e.stopPropagation();
    if (pendingPreview) { URL.revokeObjectURL(pendingPreview); setPendingPreview(null); }
    // Bỏ ảnh đã tải; nếu ảnh đó đang được chọn thì bỏ luôn lựa chọn.
    setCover((cur) => (cur === uploadedUrl ? null : cur));
    setUploadedUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(goToStudents: boolean) {
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        name,
        cover_url: cover,
        description,
        starts_on: startsOn || null,
        ends_on: endsOn || null,
      };
      if (isEdit && editing) {
        const { classroom } = await updateClassroom(editing.id, payload);
        onSaved(classroom, { goToStudents });
      } else {
        const { classroom, warning } = await createClassroom(payload);
        if (warning) toast.warning(warning);
        onSaved(classroom, { goToStudents });
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

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    submit(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa lớp học" : "Tạo lớp học"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          {!isEdit && (
            <Button variant="ghost" onClick={() => submit(false)} loading={saving}>
              Chỉ lưu
            </Button>
          )}
          <Button type="submit" form="class-form" loading={saving}>
            {isEdit ? "Lưu thay đổi" : "Lưu & thêm học viên"}
          </Button>
        </>
      }
    >
      <form id="class-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4" noValidate>
        {errors._ && (
          <div className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">{errors._}</div>
        )}

        <FormField htmlFor="c-name" label="Tên lớp học" required error={errors.name}>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text">Ảnh đại diện</span>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCover(p.cover_url)}
                className={cn(
                  "relative aspect-video overflow-hidden rounded-xl border-[1.5px] transition-colors",
                  cover === p.cover_url ? "border-brand" : "border-border"
                )}
              >
                <CoverThumb cover={p.cover_url} name={name || "Lớp"} className="h-full w-full" />
                {cover === p.cover_url && (
                  <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            {(() => {
              // Ô ảnh đã tải giữ độc lập với ô đang chọn → chọn màu preset KHÔNG làm mất ảnh.
              const custom = pendingPreview ?? uploadedUrl;
              const selected = !!custom && cover === custom;
              if (custom) {
                return (
                  <button
                    type="button"
                    onClick={() => setCover(custom)}
                    aria-label={selected ? "Ảnh đã tải lên (đang chọn)" : "Chọn ảnh đã tải lên"}
                    className={cn(
                      "relative aspect-video overflow-hidden rounded-xl border-[1.5px]",
                      selected ? "border-brand" : "border-border"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={custom} alt="" className="h-full w-full object-cover" />
                    {uploading ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                        <Loader2 className="size-5 animate-spin" />
                      </span>
                    ) : (
                      <>
                        {selected && (
                          <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                        )}
                        <span
                          onClick={clearCover}
                          role="button"
                          aria-label="Xoá ảnh đã tải lên"
                          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-danger text-white shadow"
                        >
                          <X className="size-3" strokeWidth={3} />
                        </span>
                      </>
                    )}
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-border-strong text-text-muted transition-colors hover:border-brand hover:text-brand"
                >
                  <Upload className="size-4" />
                  <span className="text-[11px]">Tải lên</span>
                </button>
              );
            })()}
          </div>
          {errors.cover && <p className="text-xs font-medium text-danger">{errors.cover}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField htmlFor="c-start" label="Ngày bắt đầu" error={errors.starts_on}>
            <Input
              id="c-start"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </FormField>
          <FormField htmlFor="c-end" label="Ngày kết thúc" error={errors.ends_on}>
            <Input
              id="c-end"
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </FormField>
        </div>

        <FormField htmlFor="c-desc" label="Mô tả" error={errors.description}>
          <textarea
            id="c-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
          />
        </FormField>
      </form>
    </Modal>
  );
}
