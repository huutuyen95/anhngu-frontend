"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { StudentTestResult } from "@/features/tests/student-test-result";
import { classTestsRoot } from "@/features/tests/routes";

/**
 * Kết quả bài làm khi vào từ lớp học. Giữ `?mission=` để nút "Làm lại" mở tiếp một lượt
 * CỦA NHIỆM VỤ (và bị chặn khi hết `attempts_allowed`), chứ không rơi về lượt tự luyện.
 */
export default function ClassTestResultPage() {
  return (
    <Suspense fallback={null}>
      <ClassTestResultInner />
    </Suspense>
  );
}

function ClassTestResultInner() {
  const { classId, attemptId } = useParams<{ classId: string; attemptId: string }>();
  const missionId = Number(useSearchParams().get("mission")) || null;

  return (
    <StudentTestResult
      basePath={classTestsRoot(classId)}
      attemptId={attemptId}
      missionId={missionId}
    />
  );
}
