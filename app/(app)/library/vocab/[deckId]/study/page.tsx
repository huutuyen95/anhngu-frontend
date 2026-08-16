"use client";

import { use } from "react";
import { DeckStudy } from "@/features/vocabulary/deck-study";

export default function LibraryVocabStudyPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId: rawDeckId } = use(params);
  const deckId = Number(rawDeckId);

  return (
    <DeckStudy
      deckId={deckId}
      subtitle="Tự luyện · Thư viện"
      backHref={`/library/vocab/${deckId}`}
      doneHref={`/library/vocab/${deckId}`}
      doneLabel="Về bộ từ"
    />
  );
}
