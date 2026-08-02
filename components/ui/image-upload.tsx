"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, Upload, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/api/media";
import { cn } from "@/lib/utils";

const ACCEPT = ".jpg,.jpeg,.png,.webp";
const MAX_MB = 2;

type GridProps = {
  images: string[];
  onChange: (next: string[]) => void;
  className?: string;
};

/** Upload nhiều ảnh (multipart, từng ảnh) → lưới thumbnail + nút xoá từng ảnh. */
export function ImageGridUpload({ images, onChange, className }: GridProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    const list = Array.from(files);
    const tooBig = list.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      toast.error(`Mỗi ảnh phải ≤ ${MAX_MB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(list.map((f) => uploadMedia(f, "image")));
      onChange([...images, ...uploaded.map((u) => u.url)]);
    } catch {
      toast.error("Tải ảnh thất bại.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)}
      />
      {images.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="group relative size-20 shrink-0 overflow-hidden rounded-xl border-[1.5px] border-border bg-surface-alt"
        >
          <img src={url} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label="Xoá ảnh"
            className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-border-strong text-text-muted transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-60"
      >
        <Plus className="size-4" />
        <span className="text-[11px]">{uploading ? "Đang tải…" : "Thêm ảnh"}</span>
      </button>
    </div>
  );
}

type Props = {
  /** URL ảnh hiện tại (đã lưu). */
  value: string | null;
  /** Gọi khi có URL mới (upload xong) hoặc null (khi xoá). */
  onChange: (url: string | null) => void;
  /** Hàm upload thực tế → trả { url }. */
  upload: (file: File) => Promise<{ url: string }>;
  shape?: "circle" | "square";
  className?: string;
  maxMB?: number;
  label?: string;
};

/**
 * Ô upload ảnh: hiện preview NGAY khi chọn (object URL) trước cả khi upload xong,
 * có nút ✕ để xoá nếu chọn nhầm. Dùng cho ảnh bìa lớp, avatar học sinh…
 */
export function ImageUpload({ value, onChange, upload, shape = "square", className, maxMB = 2, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null); // object URL tạm khi đang tải
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dọn object URL tạm khi unmount.
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Ảnh phải ≤ ${maxMB}MB.`);
      return;
    }
    // Hiện ngay preview cục bộ.
    const local = URL.createObjectURL(file);
    setPreview(local);
    setUploading(true);
    try {
      const { url } = await upload(file);
      onChange(url);
    } catch {
      setError("Tải ảnh thất bại.");
      onChange(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(local);
      setPreview(null);
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const shown = preview ?? value;
  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-sm font-semibold text-text">{label}</span>}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex size-20 shrink-0 items-center justify-center overflow-hidden border-[1.5px] transition-colors",
            rounded,
            shown ? "border-brand" : "border-dashed border-border-strong text-text-muted hover:border-brand hover:text-brand"
          )}
          aria-label={shown ? "Đổi ảnh" : "Tải ảnh lên"}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1">
              <ImagePlus className="size-5" />
              <span className="text-[10px]">Tải ảnh</span>
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
              <Loader2 className="size-5 animate-spin" />
            </span>
          )}
        </button>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:border-brand hover:text-brand"
          >
            <Upload className="size-3.5" /> {shown ? "Đổi ảnh" : "Tải ảnh lên"}
          </button>
          {shown && !uploading && (
            <button type="button" onClick={clear} className="text-left text-xs font-medium text-danger hover:underline">
              Xoá ảnh
            </button>
          )}
          <span className="text-[11px] text-text-muted">≤ {maxMB}MB · JPG/PNG/WebP</span>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
