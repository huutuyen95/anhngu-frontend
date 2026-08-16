import { Suspense } from "react";
import { VocabularyLibrary, VocabularyLibrarySkeleton } from "@/features/vocabulary/vocabulary-library";

export default function VocabLibraryPage() {
  return (
    <Suspense fallback={<VocabularyLibrarySkeleton />}>
      <VocabularyLibrary />
    </Suspense>
  );
}
