"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/api";
import { cardsImportTemplateUrl, commitCardsImport, previewCardsImport } from "@/lib/api/decks";
import type { CardImportPreview } from "@/lib/types/deck";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationProgressModal } from "@/components/ui/operation-progress-modal";
import { useOperationProgress } from "@/hooks/use-operation-progress";

const TONE = { ok: "success", need_ipa: "warning", duplicate: "warning", error: "danger" } as const;

export function CardImportWizard({ open, onClose, deckId, onDone }: { open: boolean; onClose: () => void; deckId: number; onDone: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CardImportPreview | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; error: number } | null>(null);
  const [autoIpa, setAutoIpa] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const operation = useOperationProgress();

  function close() { setStep(1); setFile(null); setPreview(null); setResult(null); operation.reset(); onClose(); }

  async function handleFile(f: File) {
    setFile(f); setBusy(true);
    try { setPreview(await previewCardsImport(deckId, f)); setStep(2); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Không đọc được file."); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!file) return;
    setBusy(true);
    operation.start();
    try {
      const imported = await commitCardsImport(deckId, file, { auto_ipa: autoIpa, overwrite });
      setResult(imported);
      onDone();
      operation.complete();
      await new Promise((resolve) => setTimeout(resolve, 650));
      close();
      router.replace(`/teacher/vocabulary/${deckId}?import=success&created=${imported.created}&updated=${imported.updated}&skipped=${imported.skipped}&errors=${imported.error}`);
      toast.success("Import thẻ từ hoàn tất. Danh sách đã được cập nhật.");
    }
    catch (e) { operation.reset(); toast.error(e instanceof Error ? e.message : "Import thất bại."); }
    finally { setBusy(false); }
  }

  return (
    <>
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import thẻ từ Excel"
      description={`Bước ${step}/3`}
      footer={
        step === 1 ? (
          <>
            <button type="button" onClick={() => downloadFile(cardsImportTemplateUrl(), "mau-import-tu-vung.xlsx").catch(() => toast.error("Không tải được file mẫu."))} className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              <Download className="size-4" /> Tải file mẫu
            </button>
            <Button variant="outline" onClick={close}>Đóng</Button>
          </>
        ) : step === 2 ? (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>Quay lại</Button>
            <Button onClick={commit} loading={busy} disabled={!preview || preview.summary.ok + preview.summary.need_ipa + (overwrite ? preview.summary.duplicate : 0) === 0}>
              Import {(preview?.summary.ok ?? 0) + (preview?.summary.need_ipa ?? 0)} thẻ
            </Button>
          </>
        ) : (
          <Button onClick={close}>Xong</Button>
        )
      }
    >
      {step === 1 && (
        <div className="py-4">
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex w-full flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-border-strong bg-surface-alt p-10 text-center hover:border-brand">
            <UploadCloud className="size-10 text-brand" />
            <span className="font-semibold text-text">{busy ? "Đang đọc…" : "Chọn file Excel (.xlsx / .csv)"}</span>
            <span className="text-sm text-text-muted">Cột: term · meaning · ipa · pos · example</span>
          </button>
        </div>
      )}

      {step === 2 && preview && (
        <div className="py-2">
          <div className="mb-3 flex flex-wrap gap-2 text-sm">
            <StatusBadge tone="success">Hợp lệ: {preview.summary.ok}</StatusBadge>
            <StatusBadge tone="warning">Thiếu phiên âm: {preview.summary.need_ipa}</StatusBadge>
            <StatusBadge tone="warning">Trùng: {preview.summary.duplicate}</StatusBadge>
            <StatusBadge tone="danger">Lỗi: {preview.summary.error}</StatusBadge>
          </div>
          <div className="mb-3 flex flex-col gap-2">
            <Checkbox checked={autoIpa} onCheckedChange={setAutoIpa} label={`Tự tra phiên âm cho ${preview.summary.need_ipa} thẻ còn thiếu`} />
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" checked={!overwrite} onChange={() => setOverwrite(false)} /> Bỏ qua trùng</label>
              <label className="flex items-center gap-1.5"><input type="radio" checked={overwrite} onChange={() => setOverwrite(true)} /> Ghi đè</label>
            </div>
          </div>
          <div className="max-h-64 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-text-secondary"><tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Từ</th><th className="px-3 py-2 text-left">Nghĩa</th><th className="px-3 py-2 text-left">Trạng thái</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row} className="border-t border-border">
                    <td className="px-3 py-2 text-text-muted">{r.row}</td>
                    <td className="px-3 py-2 text-text">{r.term || "—"}</td>
                    <td className="px-3 py-2 text-text">{r.meaning || "—"}</td>
                    <td className="px-3 py-2"><StatusBadge tone={TONE[r.status]}>{r.reasons[0] ?? "Hợp lệ"}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-text-muted">Chưa ghi gì vào hệ thống — bấm Import để tạo thẻ.</p>
        </div>
      )}

      {step === 3 && result && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="font-semibold text-text">Đã tạo {result.created} thẻ{result.updated ? `, cập nhật ${result.updated}` : ""}</p>
          <p className="text-sm text-text-muted">Bỏ qua {result.skipped} trùng, {result.error} lỗi.</p>
        </div>
      )}
    </Modal>
    <OperationProgressModal
      open={operation.running}
      progress={operation.progress}
      title="Đang import thẻ từ"
      description="Hệ thống đang kiểm tra và ghi các thẻ từ vào bộ từ vựng."
      completedDescription="Import hoàn tất. Đang mở danh sách thẻ từ…"
    />
    </>
  );
}
