"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** Nếu có: người dùng phải gõ đúng chuỗi này thì nút xác nhận mới bật. */
  requireText?: string;
  requireTextHint?: string;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Xác nhận",
  danger,
  requireText,
  requireTextHint,
}: ConfirmDialogProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const canConfirm = !requireText || text.trim() === requireText;

  async function handleConfirm() {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={loading}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && (
        <div className="text-sm text-text-secondary">{description}</div>
      )}
      {requireText && (
        <div className="mt-4">
          <p className="mb-1.5 text-sm text-text">
            {requireTextHint ?? `Gõ "${requireText}" để xác nhận:`}
          </p>
          <Input value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </div>
      )}
    </Modal>
  );
}
