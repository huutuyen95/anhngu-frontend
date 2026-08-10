"use client";

import { useParams } from "next/navigation";
import { StudentTestIntro } from "@/features/tests/student-test-intro";
import { LIBRARY_TESTS_ROOT } from "@/features/tests/routes";

export default function LibraryTestIntroPage() {
  const { id } = useParams<{ id: string }>();
  return <StudentTestIntro basePath={LIBRARY_TESTS_ROOT} testId={id} />;
}
