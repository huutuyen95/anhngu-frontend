"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { StudentTestAttempt } from "@/features/tests/student-test-attempt";
import { classTestsRoot } from "@/features/tests/routes";

/**
 * Màn làm bài khi vào từ lớp học. Không cần `?mission=` ở đây — lượt đã được tạo và gắn
 * mission từ trang giới thiệu đề; màn này chỉ làm việc với `attemptId`.
 */
export default function ClassTestAttemptPage() {
  const { classId, id, attemptId } = useParams<{
    classId: string;
    id: string;
    attemptId: string;
  }>();

  return (
    <Suspense fallback={null}>
      <StudentTestAttempt
        basePath={classTestsRoot(classId)}
        testId={id}
        attemptId={attemptId}
      />
    </Suspense>
  );
}
