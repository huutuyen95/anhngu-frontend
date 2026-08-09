"use client";

import { useParams } from "next/navigation";
import { StudentTestResult } from "@/features/tests/student-test-result";

export default function LibraryTestResultPage() {
  const { attemptId } = useParams<{ id: string; attemptId: string }>();
  return <StudentTestResult attemptId={attemptId} />;
}
