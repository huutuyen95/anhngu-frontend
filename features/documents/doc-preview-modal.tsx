"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Paperclip, CheckCircle2, Columns2, Smartphone, Monitor } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cleanDocHtml } from "@/lib/sanitize";
import { formatBytes, type Attachment } from "@/lib/types/document";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  type: "document" | "lecture";
  readingMinutes: number;
  author?: string;
  attachments?: Attachment[];
};

type Mode = "compare" | "mobile" | "desktop";
const MODES: { key: Mode; label: string; icon: typeof Columns2 }[] = [
  { key: "compare", label: "So sánh", icon: Columns2 },
  { key: "mobile", label: "Mobile", icon: Smartphone },
  { key: "desktop", label: "Desktop", icon: Monitor },
];

/** Xem trước tài liệu như học sinh — so sánh mobile/desktop hoặc xem riêng từng loại. */
export function DocPreviewModal({ open, onClose, title, body, type, readingMinutes, author, attachments = [] }: Props) {
  const [mode, setMode] = useState<Mode>("compare");
  const html = useMemo(() => cleanDocHtml(body), [body]);
  const typeLabel = type === "lecture" ? "Bài giảng" : "Tài liệu";
  const today = new Date().toLocaleDateString("vi-VN");
  const shownTitle = title.trim() || "Chưa có tiêu đề";
  const metaMobile = [typeLabel, author].filter(Boolean).join(" · ");
  const metaDesktop = [typeLabel, author, today, `${readingMinutes} phút đọc`].filter(Boolean).join(" · ");

  const mobilePanel = (
    <section className="flex w-full flex-col rounded-2xl bg-surface p-4 shadow-[0_4px_16px_rgba(58,51,48,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Mobile 390</p>
      <div className="mt-3 flex items-start gap-2">
        <ArrowLeft className="mt-0.5 size-4 shrink-0 text-text-secondary" />
        <div className="min-w-0">
          <p className="font-display text-base font-bold leading-snug text-text">{shownTitle}</p>
          {metaMobile && <p className="mt-0.5 text-xs text-text-muted">{metaMobile}</p>}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-alt"><div className="h-full w-2/5 rounded-full bg-brand" /></div>
      <div className="doc-prose mt-3 max-h-[46vh] overflow-y-auto pr-1 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
      {attachments.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
              <Paperclip className="size-4 shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{a.name}</span>
                <span className="text-xs text-text-muted">{formatBytes(a.size_bytes)}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand">Tải</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" disabled
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-2.5 font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)]">
        <CheckCircle2 className="size-5" /> Đánh dấu đã học xong
      </button>
    </section>
  );

  const desktopPanel = (
    <section className="flex w-full flex-col rounded-2xl bg-surface p-5 shadow-[0_4px_16px_rgba(58,51,48,0.06)] sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Desktop ≥1024 · nội dung tối đa 68 ký tự/dòng</p>
      <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-text">{shownTitle}</h1>
      <p className="mt-1 text-sm text-text-muted">{metaDesktop}</p>
      <div className="doc-prose mt-4 max-h-[50vh] max-w-[68ch] overflow-y-auto pr-1" dangerouslySetInnerHTML={{ __html: html }} />
      {attachments.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5 text-sm">
              <Paperclip className="size-4 shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate text-text">{a.name}</span>
              <span className="text-xs text-text-muted">{formatBytes(a.size_bytes)}</span>
              <span className="text-sm font-semibold text-brand">Tải</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <Modal open={open} onClose={onClose} size="2xl" title="Xem trước như học sinh"
      description="So sánh bản mobile và desktop · không ghi nhận lượt xem"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-sm text-text-muted">Cuộn hết 80% nội dung là tự đánh dấu đã xem</span>
          <Button onClick={onClose}>Đóng xem trước</Button>
        </div>
      }>
      {/* Chuyển chế độ xem */}
      <div className="mb-3 inline-flex rounded-full bg-surface-alt p-1">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={cn("flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              mode === m.key ? "bg-surface text-brand shadow-sm" : "text-text-secondary hover:text-text")}>
            <m.icon className="size-4" /> {m.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-bg p-3 sm:p-4">
        {mode === "compare" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
            {mobilePanel}
            {desktopPanel}
          </div>
        ) : mode === "mobile" ? (
          <div className="mx-auto w-full max-w-[390px]">{mobilePanel}</div>
        ) : (
          <div className="mx-auto w-full max-w-4xl">{desktopPanel}</div>
        )}
      </div>
    </Modal>
  );
}
