"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { StudentTestAttempt } from "@/features/tests/student-test-attempt";
import { LIBRARY_TESTS_ROOT } from "@/features/tests/routes";

export default function LibraryTestAttemptPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  return (
    // Suspense vì màn làm bài đọc `?deadline=` bằng `useSearchParams`.
    <Suspense fallback={null}>
      <StudentTestAttempt
        basePath={LIBRARY_TESTS_ROOT}
        testId={id}
        attemptId={attemptId}
      />
    </Suspense>
  );
}
