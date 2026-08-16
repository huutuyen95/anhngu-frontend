"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SettingField, SettingValue } from "@/lib/types/setting";

const COLOR_SWATCHES = ["#F2793B", "#E5604C", "#7FAB2A", "#56C2EE", "#B06CD6"];

type Props = {
  field: SettingField;
  value: SettingValue;
  onChange: (key: string, value: SettingValue) => void;
  onUpload: (key: string, file: File) => Promise<void>;
  onDeleteFile: (key: string) => void;
};

export function SettingControl({ field, value, onChange, onUpload, onDeleteFile }: Props) {
  const { key, type, options } = field;
  const disabled = field.readonly;

  // ── Bool → công tắc kèm chữ ──
  if (type === "bool") {
    const on = value === true || value === 1 || value === "1";
    return (
      <div className="flex items-center gap-3">
        <Switch checked={on} onCheckedChange={(v) => onChange(key, v)} />
        <span className={cn("text-sm font-semibold", on ? "text-success-bold" : "text-text-muted")}>
          {on ? "Đang bật" : "Đã tắt"}
        </span>
      </div>
    );
  }

  // ── File → upload preview ──
  if (type === "file") {
    return (
      <FileControl field={field} value={value} onUpload={onUpload} onDeleteFile={onDeleteFile} />
    );
  }

  // ── Màu → swatch ──
  if (key === "brand.primary_color") {
    const current = (value as string) ?? "";
    const swatches = [...new Set([...COLOR_SWATCHES, current].filter(Boolean))];
    return (
      <div className="flex items-center gap-2">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Chọn màu ${c}`}
            onClick={() => onChange(key, c)}
            className={cn(
              "size-8 rounded-full border-2 transition-transform active:scale-90",
              current.toLowerCase() === c.toLowerCase()
                ? "border-text ring-2 ring-brand/40"
                : "border-white shadow-[0_0_0_1.5px_var(--color-border)]",
            )}
            style={{ background: c }}
          />
        ))}
        <input
          type="text"
          value={current}
          onChange={(e) => onChange(key, e.target.value)}
          className="h-11 w-28 rounded-full border-[1.5px] border-border bg-surface px-3 text-sm font-medium text-text outline-none focus:border-brand"
          placeholder="#F2793B"
        />
      </div>
    );
  }

  // ── Có options → radio pill (kiểu thẻ chọn) ──
  if (options && options.length > 0) {
    if (options.length <= 3) {
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const active = String(value) === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(key, opt.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-2xl border-[1.5px] px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-brand bg-brand-soft text-brand-bold"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <Select value={String(value ?? "")} onChange={(e) => onChange(key, e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    );
  }

  // ── Số → ô hẹp + đơn vị ──
  if (type === "int" || type === "float") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={type === "float" ? "0.1" : "1"}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(key, e.target.value === "" ? "" : type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
          }
          disabled={disabled}
          className="h-11 w-24 rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-semibold text-text outline-none focus:border-brand disabled:opacity-60"
        />
        {field.unit && <span className="text-sm font-medium text-text-muted">{field.unit}</span>}
      </div>
    );
  }

  // ── Chuỗi dài → textarea ──
  if (key.endsWith("signature") || key.endsWith("maintenance_message")) {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
        rows={3}
        className="w-full max-w-md resize-none rounded-2xl border-[1.5px] border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-brand"
      />
    );
  }

  // ── Chuỗi ──
  return (
    <input
      type={field.secret ? "password" : "text"}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(key, e.target.value)}
      readOnly={disabled}
      placeholder={field.secret ? "••••••••" : ""}
      className="h-11 w-full max-w-md rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-medium text-text outline-none focus:border-brand read-only:opacity-70"
    />
  );
}

function FileControl({
  field,
  value,
  onUpload,
  onDeleteFile,
}: {
  field: SettingField;
  value: SettingValue;
  onUpload: (key: string, file: File) => Promise<void>;
  onDeleteFile: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const url = typeof value === "string" && value ? value : null;
  const widePreview = field.key === "brand.student.banner";

  async function handleFile(file: File) {
    setBusy(true);
    setName(`${file.name} · ${(file.size / 1024).toFixed(0)} KB`);
    try {
      await onUpload(field.key, file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex gap-3", widePreview ? "w-full max-w-xl flex-col items-start" : "items-center")}>
      <div className={cn(
        "flex items-center justify-center overflow-hidden border-[1.5px] border-border bg-surface-alt",
        widePreview ? "aspect-[5/1] w-full rounded-xl" : "size-16 rounded-2xl",
      )}>
        {busy ? (
          <Loader2 className="size-5 animate-spin text-text-muted" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={field.label} className={cn("size-full", widePreview ? "object-cover" : "object-contain")} />
        ) : (
          <span className="text-[10px] font-medium text-text-muted">Chưa có</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-border-strong"
          >
            <Upload className="size-3.5" /> Tải lên
          </button>
          {url && (
            <button
              type="button"
              onClick={() => onDeleteFile(field.key)}
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-danger/30 bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger hover:border-danger/60"
            >
              <Trash2 className="size-3.5" /> Xoá
            </button>
          )}
        </div>
        {name && <span className="text-[11px] text-text-muted">{name}</span>}
      </div>
      <input
        id={field.key}
        ref={inputRef}
        type="file"
        aria-label={`Tải ${field.label}`}
        accept={field.accept?.split(",").map((e) => `.${e}`).join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
