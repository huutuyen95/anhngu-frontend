"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DeckStudy } from "@/features/vocabulary/deck-study";

function Inner() {
  const params = useParams<{ classId: string; deckId: string }>();
  const search = useSearchParams();
  const classId = Number(params.classId);
  const deckId = Number(params.deckId);
  const session = search.get("session");
  const q = session ? `?session=${session}` : "";

  return (
    <DeckStudy
      deckId={deckId}
      classroomId={classId}
      subtitle="Học trong lớp"
      backHref={`/classes/${classId}/vocab/${deckId}${q}`}
      doneHref={`/classes/${classId}${q}`}
      doneLabel="Về buổi học"
    />
  );
}

export default function ClassVocabStudyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md p-4"><div className="h-72 animate-pulse rounded-3xl bg-neutral-200" /></div>}>
      <Inner />
    </Suspense>
  );
}
