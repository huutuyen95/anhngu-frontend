"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DeckDetail, DeckDetailSkeleton } from "@/features/vocabulary/deck-detail";

function Inner() {
  const params = useParams<{ classId: string; deckId: string }>();
  const search = useSearchParams();
  const classId = Number(params.classId);
  const deckId = Number(params.deckId);
  const session = search.get("session");
  const query = session ? `?session=${session}` : "";

  return (
    <DeckDetail
      deckId={deckId}
      classroomId={classId}
      backHref={`/classes/${classId}${query}`}
      studyHref={`/classes/${classId}/vocab/${deckId}/study${query}`}
      progressLabel="Tiến độ của em trong lớp"
    />
  );
}

export default function ClassVocabDetailPage() {
  return (
    <Suspense fallback={<DeckDetailSkeleton />}>
      <Inner />
    </Suspense>
  );
}
