"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { ApiError, downloadFile } from "@/lib/api";
import { commitImport, previewImport, importTemplateUrl } from "@/lib/api/students";
import type { ImportPreview, ImportResult } from "@/lib/types/student";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

type Props = { open: boolean; onClose: () => void; onDone: () => void };

const STATUS_TONE = {
  ok: "success",
  duplicate: "warning",
  error: "danger",
} as const;

export function ImportWizard({ open, onClose, onDone }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "update">("skip");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(1);
    setFile(null);
    setPreview(null);
    setResult(null);
    setBusy(false);
    setOnDuplicate("skip");
  }

  function downloadRows(rows: { row: number; name: string; email: string; class: string | null; status: string; reasons: string[] }[], name: string) {
    const lines = ["dong,ho_ten,email,lop,trang_thai,ly_do", ...rows.map((r) => `${r.row},"${r.name}","${r.email}","${r.class ?? ""}",${r.status},"${r.reasons.join("; ")}"`)];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(f: File) {
    setFile(f);
    setBusy(true);
    try {
      const p = await previewImport(f);
      setPreview(p);
      setStep(2);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không đọc được file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setBusy(true);
    try {
      const r = await commitImport(file, onDuplicate);
      setResult(r);
      setStep(3);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import thất bại.");
    } finally {
      setBusy(false);
    }
  }

  function downloadPasswords() {
    if (!result) return;
    const lines = ["email,password", ...result.created.map((c) => `${c.email},${c.password}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mat-khau-hoc-sinh-moi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import học sinh từ Excel"
      description={`Bước ${step}/3`}
      footer={
        step === 1 ? (
          <>
            <button
              type="button"
              onClick={() =>
                downloadFile(importTemplateUrl(), "mau-import-hoc-sinh.xlsx").catch(() =>
                  toast.error("Không tải được file mẫu."),
                )
              }
              className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <Download className="size-4" /> Tải file mẫu
            </button>
            <Button variant="outline" onClick={close}>
              Đóng
            </Button>
          </>
        ) : step === 2 ? (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>
              Quay lại
            </Button>
            <Button
              onClick={handleCommit}
              loading={busy}
              disabled={!preview || (preview.summary.ok === 0 && !(onDuplicate === "update" && preview.summary.duplicate > 0))}
            >
              Import {preview?.summary.ok ?? 0} học sinh{onDuplicate === "update" && (preview?.summary.duplicate ?? 0) > 0 ? ` · cập nhật ${preview!.summary.duplicate}` : ""}
            </Button>
          </>
        ) : (
          <Button onClick={close}>Xong</Button>
        )
      }
    >
      {step === 1 && (
        <div className="py-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className={`flex w-full flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed bg-surface-alt p-10 text-center transition-colors ${dragging ? "border-brand bg-brand-soft/40" : "border-border-strong hover:border-brand"}`}
          >
            <UploadCloud className="size-10 text-brand" />
            <span className="font-semibold text-text">
              {busy ? "Đang đọc file..." : "Chọn file Excel (.xlsx / .csv)"}
            </span>
            <span className="text-sm text-text-muted">
              Cột: name · email · phone · class · note
            </span>
          </button>
        </div>
      )}

      {step === 2 && preview && (
        <div className="py-2">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge tone="success">Hợp lệ: {preview.summary.ok}</StatusBadge>
            <StatusBadge tone="warning">Trùng: {preview.summary.duplicate}</StatusBadge>
            <StatusBadge tone="danger">Lỗi: {preview.summary.error}</StatusBadge>
            {preview.summary.error + preview.summary.duplicate > 0 && (
              <button type="button" onClick={() => downloadRows(preview.rows.filter((r) => r.status !== "ok"), "dong-loi-import.csv")}
                className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><Download className="size-4" /> Tải danh sách dòng lỗi</button>
            )}
          </div>

          {preview.summary.duplicate > 0 && (
            <div className="mb-3 rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Email đã tồn tại — xử lý thế nào?</p>
              <div className="flex flex-col gap-1.5">
                {([["skip", "Bỏ qua dòng trùng"], ["update", "Cập nhật thông tin học sinh hiện có"]] as const).map(([v, label]) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="ondup" checked={onDuplicate === v} onChange={() => setOnDuplicate(v)} className="accent-brand" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Họ tên</th>
                  <th className="px-3 py-2 text-left font-semibold">Email</th>
                  <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row} className="border-t border-border">
                    <td className="px-3 py-2 text-text-muted">{r.row}</td>
                    <td className="px-3 py-2 text-text">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-text">{r.email || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={STATUS_TONE[r.status]}>
                        {r.status === "ok"
                          ? "Hợp lệ"
                          : r.status === "duplicate"
                            ? "Trùng"
                            : r.reasons[0] ?? "Lỗi"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Chưa có gì được ghi vào hệ thống. Bấm Import để tạo các dòng hợp lệ.
          </p>
        </div>
      )}

      {step === 3 && result && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FileSpreadsheet className="size-10 text-success" />
          <p className="font-semibold text-text">
            Đã tạo {result.summary.ok} học sinh{(result.summary.updated ?? 0) > 0 ? ` · cập nhật ${result.summary.updated}` : ""}
          </p>
          <p className="text-sm text-text-muted">
            {(result.summary.updated ?? 0) > 0 ? `Cập nhật ${result.summary.updated} trùng · ` : `Bỏ qua ${result.summary.duplicate} trùng · `}{result.summary.error} lỗi.
          </p>
          {result.created.length > 0 && (
            <Button variant="outline" iconLeft={<Download className="size-4" />} onClick={downloadPasswords}>
              Tải danh sách mật khẩu tạm
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
