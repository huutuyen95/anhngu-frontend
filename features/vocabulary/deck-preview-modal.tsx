"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Card, Deck } from "@/lib/types/deck";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PronounceButton } from "@/components/ui/pronounce-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExampleText } from "@/features/vocabulary/example-text";

export function DeckPreviewModal({ open, onClose, deck, cards }: { open: boolean; onClose: () => void; deck: Deck; cards: Card[] }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  const c = cards[i];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Xem như học sinh"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-text-muted">Thẻ {cards.length ? i + 1 : 0}/{cards.length} · đọc tự động {deck.tts_voice} {deck.tts_rate}×</span>
          <Button variant="outline" onClick={onClose}>Đóng bản xem trước</Button>
        </div>
      }
    >
      {!c ? (
        <p className="py-8 text-center text-sm text-text-muted">Bộ từ chưa có thẻ nào.</p>
      ) : (
        <div className="py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Mặt trước */}
            <div className="flex flex-col items-center gap-2 rounded-2xl border-[1.5px] border-border bg-surface-alt p-5 text-center">
              <span className="text-xs font-semibold uppercase text-text-muted">Mặt trước</span>
              {c.image_url && <img src={c.image_url} alt="" className="h-28 w-full rounded-xl object-cover" />}
              <p className="font-display text-2xl font-extrabold text-text">{c.term}</p>
              {c.ipa && <p className="font-mono text-sm text-text-secondary">{c.ipa}</p>}
              <PronounceButton term={c.term} audioUrl={c.audio_url} voiceKey={deck.tts_voice} rate={deck.tts_rate} />
            </div>
            {/* Mặt sau */}
            <div className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-border bg-surface p-5">
              <span className="text-xs font-semibold uppercase text-text-muted">Mặt sau</span>
              <div className="flex items-center gap-2">
                <p className="font-display text-xl font-bold text-text">{c.meaning}</p>
                {c.pos && <StatusBadge tone="info">{c.pos}</StatusBadge>}
              </div>
              {c.example && (
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-text-secondary"><ExampleText text={c.example} /></p>
                  <PronounceButton term={c.example.replace(/\*/g, "")} voiceKey={deck.tts_voice} rate={deck.tts_rate} size="sm" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" iconLeft={<ChevronLeft className="size-4" />} disabled={i === 0} onClick={() => setI(i - 1)}>Trước</Button>
            <Button variant="outline" size="sm" iconRight={<ChevronRight className="size-4" />} disabled={i >= cards.length - 1} onClick={() => setI(i + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
