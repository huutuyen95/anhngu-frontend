"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/api/media";
import { cn } from "@/lib/utils";

const ACCEPT = ".jpg,.jpeg,.png,.webp";
const MAX_MB = 2;

type Props = {
  images: string[];
  onChange: (next: string[]) => void;
  className?: string;
};

/** Upload nhiều ảnh (multipart, từng ảnh) → lưới thumbnail + nút xoá từng ảnh. */
export function ImageUpload({ images, onChange, className }: Props) {
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
