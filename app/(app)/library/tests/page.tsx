import { Suspense } from "react";
import { StudentTestLibrary } from "@/features/tests/student-test-library";
import { LIBRARY_TESTS_ROOT } from "@/features/tests/routes";

/** Thư viện của em → Đề thi. Suspense vì màn dùng `useSearchParams` (bộ lọc trên URL). */
export default function LibraryTestsPage() {
  return (
    <Suspense fallback={null}>
      <StudentTestLibrary basePath={LIBRARY_TESTS_ROOT} />
    </Suspense>
  );
}
