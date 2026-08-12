"use client";

import { useParams } from "next/navigation";
import { StudentTestResult } from "@/features/tests/student-test-result";
import { LIBRARY_TESTS_ROOT } from "@/features/tests/routes";

export default function LibraryTestResultPage() {
  const { attemptId } = useParams<{ id: string; attemptId: string }>();
  return (
    <StudentTestResult basePath={LIBRARY_TESTS_ROOT} attemptId={attemptId} />
  );
}
