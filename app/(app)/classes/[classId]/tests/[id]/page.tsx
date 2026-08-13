"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { StudentTestIntro } from "@/features/tests/student-test-intro";
import { classTestsRoot } from "@/features/tests/routes";

/**
 * Giới thiệu đề khi vào TỪ LỚP HỌC. `?mission=` là nhiệm vụ cô giao — truyền xuống để lượt
 * làm gắn vào đúng nhiệm vụ đó (tính vào tiến trình + báo cáo lớp). Cùng đề này mở từ
 * `/library/tests/...` thì không có mission → tự luyện, hoàn toàn tách biệt.
 */
export default function ClassTestIntroPage() {
  return (
    <Suspense fallback={null}>
      <ClassTestIntroInner />
    </Suspense>
  );
}

function ClassTestIntroInner() {
  const { classId, id } = useParams<{ classId: string; id: string }>();
  const missionId = Number(useSearchParams().get("mission")) || null;

  return (
    <StudentTestIntro
      basePath={classTestsRoot(classId)}
      testId={id}
      missionId={missionId}
    />
  );
}
