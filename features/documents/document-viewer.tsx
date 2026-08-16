"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Paperclip, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { readDocument, reportView } from "@/lib/api/documents";
import type { Doc } from "@/lib/types/document";
import { formatBytes } from "@/lib/types/document";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cleanDocHtml } from "@/lib/sanitize";
import { useSelectionDictionary } from "@/hooks/useSelectionDictionary";
import { DictionaryPopover } from "@/features/documents/dictionary-popover";

type Props = {
  id: number;
  /** Đích nút quay lại — trong lớp về buổi học, Thư viện về danh sách tài liệu. */
  backHref: string;
};

/** Màn xem tài liệu / bài giảng — dùng chung cho khu Thư viện và trong lớp (My Class). */
export function DocumentViewer({ id, backHref }: Props) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const reported = useRef(false);

  const { popup, result, loading, close } = useSelectionDictionary(true, contentRef);

  useEffect(() => {
    readDocument(id).then((r) => {
      setDoc(r.document);
      setCompleted(r.completed);
      reported.current = r.completed;
    }).catch(() => toast.error("Không mở được tài liệu."));
  }, [id]);

  const send = useCallback((pct: number) => {
    reportView(id, pct).then((r) => {
      if (r.completed) setCompleted(true);
      if (r.mission_done) toast.success("Đã hoàn thành nhiệm vụ của buổi học!");
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    function onScroll() {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100));
      setProgress(pct);
      if (pct >= 80 && !reported.current) {
        reported.current = true;
        send(Math.max(pct, 80));
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [doc, send]);

  function markDone() {
    reported.current = true;
    setCompleted(true);
    send(100);
  }

  if (!doc) return <div className="mx-auto max-w-3xl"><div className="mt-20 h-96 animate-pulse rounded-2xl bg-neutral-200" /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="fixed inset-x-0 top-16 z-40 h-1 bg-transparent">
        <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      <PageHeader title={doc.category?.name ?? "Tài liệu"} backHref={backHref} />

      <article>
        <h1 className="font-display text-2xl font-bold text-text">{doc.title}</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500"><Clock className="size-4" /> {doc.reading_minutes} phút đọc</p>

        <div ref={contentRef} className="doc-prose mt-6" dangerouslySetInnerHTML={{ __html: cleanDocHtml(doc.body ?? "") }} />

        {doc.attachments && doc.attachments.length > 0 && (
          <div className="mt-8 rounded-2xl border-[1.5px] border-divider bg-neutral-100 p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-base font-bold text-text"><Paperclip className="size-4" /> File đính kèm</p>
            <ul className="flex flex-col gap-2">
              {doc.attachments.map((a) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-divider p-2.5 text-sm hover:border-accent hover:bg-accent-100">
                    <Download className="size-4 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-text">{a.name}</span>
                    <span className="text-xs text-neutral-500">{formatBytes(a.size_bytes)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          {completed ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-2-200 px-5 py-2.5 font-semibold text-accent-2-900"><CheckCircle2 className="size-5" /> Đã học xong</span>
          ) : (
            <Button onClick={markDone} iconLeft={<CheckCircle2 className="size-5" />}>Đánh dấu đã học xong</Button>
          )}
        </div>
      </article>

      {popup && <DictionaryPopover popup={popup} result={result} loading={loading} onClose={close} />}
    </div>
  );
}
