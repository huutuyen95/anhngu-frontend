"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Card, Deck } from "@/lib/types/deck";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StudentVocabCard } from "@/features/vocabulary/deck-detail";

export function DeckPreviewModal({ open, onClose, deck, cards }: { open: boolean; onClose: () => void; deck: Deck; cards: Card[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const safeIndex = cards.length ? Math.min(index, cards.length - 1) : 0;
  const card = cards[safeIndex];

  function closePreview() {
    setIndex(0);
    setFlipped(false);
    onClose();
  }

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  return (
    <Modal
      open={open}
      onClose={closePreview}
      size="xl"
      title="Xem card như một học sinh"
      description="Đây là đúng giao diện học sinh nhìn thấy trong Thư viện và Lớp học. Bấm card để xem mặt sau."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-text-muted">Card {cards.length ? safeIndex + 1 : 0}/{cards.length} · {deck.tts_voice} · {deck.tts_rate}×</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconLeft={<ChevronLeft className="size-4" />} disabled={safeIndex === 0} onClick={() => goTo(safeIndex - 1)}>Card trước</Button>
            <Button variant="outline" size="sm" iconRight={<ChevronRight className="size-4" />} disabled={safeIndex >= cards.length - 1} onClick={() => goTo(safeIndex + 1)}>Card sau</Button>
            <Button variant="outline" size="sm" onClick={closePreview}>Đóng</Button>
          </div>
        </div>
      }
    >
      {!card ? (
        <p className="py-12 text-center text-sm text-text-muted">Bộ từ chưa có card nào để xem trước.</p>
      ) : (
        <div className="organic mx-auto max-w-3xl rounded-3xl bg-bg p-4 sm:p-8">
          <p className="mb-4 text-center text-sm font-semibold text-neutral-600">
            {flipped ? "Mặt sau · nghĩa và câu mẫu" : "Mặt trước · từ, ảnh và phát âm"}
          </p>
          <StudentVocabCard
            key={card.id}
            card={card}
            index={safeIndex + 1}
            flipped={flipped}
            onToggle={() => setFlipped((current) => !current)}
            voiceKey={deck.tts_voice}
            rate={deck.tts_rate}
          />
          <p className="mt-4 text-center text-xs text-neutral-500">Bấm vào card hoặc nhấn Enter/Space để lật.</p>
        </div>
      )}
    </Modal>
  );
}
