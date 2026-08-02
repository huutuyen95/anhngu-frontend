"use client";

import { useRef, useState } from "react";
import { Music, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/api/media";
import { cn } from "@/lib/utils";

const ACCEPT = ".mp3,.m4a,.wav,.ogg,.aac";
const MAX_MB = 20;

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
};

/** Upload 1 file audio (multipart) → gắn URL; có sẵn <audio controls> để nghe lại + nút xoá/thay. */
export function AudioUpload({ value, onChange, className }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File audio phải ≤ ${MAX_MB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadMedia(file, "audio");
      onChange(url);
    } catch {
      toast.error("Tải audio thất bại.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-border bg-surface px-3 py-2">
          <Music className="size-4 shrink-0 text-brand" />
          <audio controls src={value} className="h-9 min-w-0 flex-1" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="shrink-0 text-xs font-semibold text-brand hover:underline disabled:pointer-events-none disabled:opacity-60"
          >
            {uploading ? "Đang tải…" : "Thay file"}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Xoá audio"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-11 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-border-strong text-sm text-text-muted transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-60"
        >
          <Upload className="size-4" />
          {uploading ? "Đang tải…" : "Tải audio lên"}
        </button>
      )}
    </div>
  );
}
