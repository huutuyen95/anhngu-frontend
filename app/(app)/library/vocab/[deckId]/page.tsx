"use client";

import { use } from "react";
import { DeckDetail } from "@/features/vocabulary/deck-detail";

export default function LibraryVocabDetailPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId: rawDeckId } = use(params);
  const deckId = Number(rawDeckId);

  return (
    <DeckDetail
      deckId={deckId}
      backHref="/library/vocab"
      studyHref={`/library/vocab/${deckId}/study`}
      progressLabel="Tiến độ tự luyện của em"
    />
  );
}
