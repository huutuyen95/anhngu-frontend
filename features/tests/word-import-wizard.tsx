"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Download, BookOpen, Check, AlertCircle, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { importWordDryRun, importWordCommit, downloadWordTemplate } from "@/lib/api/tests";
import { listAllTestFolders } from "@/lib/api/tests";
import { TEST_GROUPS, type TestGroup, type TestFormat } from "@/lib/types/test";
import type { WordImportPreview, QuestionType } from "@/lib/types/test";
import { QUESTION_TYPE_LABEL } from "@/lib/types/test";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { OperationProgressModal } from "@/components/ui/operation-progress-modal";
import { Select } from "@/components/ui/select";
import { WordGuideDrawer } from "@/features/tests/word-guide-drawer";
import { useOperationProgress } from "@/hooks/use-operation-progress";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

/** A4imp — wizard import đề từ Word. */
export function WordImportWizard({ open, onClose, onDone, format }: { open: boolean; onClose: () => void; onDone: () => void; format?: TestFormat }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [guide, setGuide] = useState(false);
  const [folders, setFolders] = useState<{ id: number; name: string; group: TestGroup }[]>([]);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<WordImportPreview | null>(null);
  const [types, setTypes] = useState<Record<number, QuestionType>>({});
  const [contents, setContents] = useState<Record<number, string>>({});
  const [committing, setCommitting] = useState(false);
  const operation = useOperationProgress();

  useEffect(() => {
    if (!open) return;
    setStep(1); setPreview(null); setFile(null); setTitle("");
    listAllTestFolders().then(setFolders).catch(() => setFolders([]));
  }, [open]);

  async function analyze() {
    if (!file) { toast.error("Chọn file .docx trước."); return; }
    setAnalyzing(true);
    try {
      const r = await importWordDryRun(file);
      setPreview(r);
      setTypes(Object.fromEntries(r.questions.map((q) => [q.n, q.type])));
      setContents({});
      if (!title) setTitle(file.name.replace(/\.(docx?|zip)$/i, ""));
      setStep(2);
    } catch (e) { toast.error((e as Error).message || "Không phân tích được file."); }
    finally { setAnalyzing(false); }
  }

  // Áp loại câu đã chỉnh vào cây parts trước khi commit.
  const editedParts = useMemo(() => {
    if (!preview) return [];
    let n = 0;
    return preview.parts.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) => { n++; return { ...q, type: types[n] ?? q.type, content: contents[n] ?? q.content }; }),
      })),
    }));
  }, [preview, types, contents]);

  async function commit() {
    if (!title.trim()) { toast.error("Nhập tên đề."); return; }
    setCommitting(true);
    operation.start();
    try {
      const { test } = await importWordCommit({ title: title.trim(), skill: "reading", format: format ?? "standard", category_id: folderId, parts: editedParts });
      operation.complete();
      await new Promise((resolve) => setTimeout(resolve, 650));
      operation.reset();
      onDone();
      onClose();
      router.push(`/teacher/tests?import=success&created=1&questions=${preview?.questions.length ?? 0}&test_id=${test.id}`);
      toast.success("Import đề thi hoàn tất. Đề mới đã có trong danh sách.");
    } catch {
      operation.reset();
      toast.error("Không lưu được đề.");
    }
    finally { setCommitting(false); }
  }

  const summary = preview?.summary;

  // Bản nội dung đầy đủ (bỏ thẻ) theo số câu, làm mặc định cho ô sửa inline.
  const plainByN = useMemo(() => {
    const map: Record<number, string> = {};
    if (!preview) return map;
    let n = 0;
    for (const p of preview.parts) for (const s of p.sections) for (const q of s.questions) {
      n++;
      map[n] = (q.content ?? "").replace(/<[^>]+>/g, "");
    }
    return map;
  }, [preview]);

  return (
    <>
      <Modal open={open} onClose={onClose} size="2xl" title="Import đề từ Word"
        description={step === 1 ? "Bước 1 · Tải file" : "Bước 2 · Kiểm tra cấu trúc"}
        footer={
          step === 1 ? (
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Huỷ</Button>
              <Button onClick={analyze} loading={analyzing} disabled={!file}>Phân tích đề →</Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <Button variant="outline" iconLeft={<ArrowLeft className="size-4" />} onClick={() => setStep(1)}>Chọn file khác</Button>
              <Button onClick={commit} loading={committing}>Import đề thi</Button>
            </div>
          )
        }>
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase text-text-muted">Thư mục đích</span>
                <Select block wrapClassName="mt-1" value={folderId ?? ""} onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Chưa phân loại</option>
                  {TEST_GROUPS.map((g) => (
                    <optgroup key={g.key} label={g.label}>
                      {folders.filter((f) => f.group === g.key).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </label>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border-strong bg-surface-alt/50 px-4 py-8 text-center hover:border-brand">
              <FileUp className="size-8 text-text-muted" />
              <span className="text-sm font-semibold text-text">{file ? file.name : "Chọn hoặc kéo file .docx vào đây"}</span>
              <span className="text-xs text-text-muted">≤ 10MB · giữ nguyên in đậm, gạch chân</span>
              <input type="file" accept=".docx,.doc" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => downloadWordTemplate().catch(() => toast.error("Không tải được file mẫu."))}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border px-3.5 py-1.5 text-sm font-semibold text-text hover:border-brand hover:text-brand"><Download className="size-4" /> Tải file Word mẫu</button>
              <button onClick={() => setGuide(true)}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border px-3.5 py-1.5 text-sm font-semibold text-text hover:border-brand hover:text-brand"><BookOpen className="size-4" /> Xem hướng dẫn định dạng</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase text-text-muted">Tên đề</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-10 w-full rounded-xl border-[1.5px] border-border bg-surface px-3 text-sm outline-none focus-visible:border-brand" />
            </label>

            {summary && (
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 font-semibold text-success-bold"><Check className="size-4" /> {summary.ok} câu nhận diện</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-semibold text-warning"><AlertCircle className="size-4" /> {summary.warn} câu thiếu lời giải</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 font-semibold text-danger"><XCircle className="size-4" /> {summary.error} câu chưa có đáp án đúng</span>
              </div>
            )}

            <div className="max-h-[46vh] overflow-y-auto rounded-2xl border-[1.5px] border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-alt text-text-secondary">
                  <tr className="h-10"><th className="w-12 px-3 text-left font-semibold">Câu</th><th className="px-3 text-left font-semibold">Nội dung</th><th className="px-3 text-left font-semibold">Loại</th><th className="px-3 text-left font-semibold">Cảnh báo</th></tr>
                </thead>
                <tbody>
                  {preview?.questions.map((q) => (
                    <tr key={q.n} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold text-text">{q.n}</td>
                      <td className="px-3 py-2">
                        <input value={contents[q.n] ?? plainByN[q.n] ?? q.text} onChange={(e) => setContents((c) => ({ ...c, [q.n]: e.target.value }))}
                          className="h-8 w-full min-w-[180px] rounded-lg border border-border bg-surface px-2 text-sm text-text outline-none focus-visible:border-brand" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={types[q.n] ?? q.type} onChange={(e) => setTypes((t) => ({ ...t, [q.n]: e.target.value as QuestionType }))}
                          className="h-8 rounded-full border-[1.5px] border-border bg-surface px-2 text-xs outline-none focus-visible:border-brand">
                          {Object.entries(QUESTION_TYPE_LABEL).filter(([k]) => k !== "speaking").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {q.status === "ok" ? <span className="text-xs text-success-bold">Ổn</span>
                          : <span className={cn("text-xs", q.status === "error" ? "text-danger" : "text-warning")}>{q.reasons.join(", ")}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-muted">Có thể đổi loại câu ngay tại đây. Gắn audio cho phần nghe & chỉnh chi tiết ở trình soạn sau khi lưu.</p>
          </div>
        )}
      </Modal>

      <WordGuideDrawer open={guide} onClose={() => setGuide(false)} />
      <OperationProgressModal
        open={operation.running}
        progress={operation.progress}
        title="Đang import đề thi"
        description={`Hệ thống đang lưu ${preview?.questions.length ?? 0} câu hỏi và cấu trúc đề.`}
        completedDescription="Import hoàn tất. Đang mở danh sách đề thi…"
      />
    </>
  );
}
