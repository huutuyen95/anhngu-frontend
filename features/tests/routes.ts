/**
 * Đường dẫn FE của luồng làm bài (KHÁC path API trong `lib/api/tests.ts`).
 *
 * Luồng chi tiết → làm bài → kết quả có thể nằm dưới nhiều "root" khác nhau:
 *   - thư viện:  /library/tests/{testId}/...
 *   - lớp học:   /classes/{classId}/tests/{testId}/...   (dự kiến)
 *
 * Nên mọi component trong luồng nhận `basePath` rồi tự dựng link qua `testRoutes`,
 * KHÔNG hardcode "/library". Chỉ chỗ đi vào luồng từ hub thư viện mới dùng
 * `LIBRARY_TESTS_ROOT`.
 */

/** Root của luồng đề thi trong khu Thư viện. */
export const LIBRARY_TESTS_ROOT = "/library/tests";

/** Root của luồng đề thi trong một lớp — dùng khi thêm route lớp học. */
export function classTestsRoot(classId: number | string): string {
  return `/classes/${classId}/tests`;
}

export type TestRoutes = {
  /** Danh sách đề của root này. */
  list: string;
  /** Trang giới thiệu đề. */
  detail: (testId: number | string) => string;
  /** Màn làm bài; `deadline` để hiện đồng hồ đếm ngược. */
  attempt: (
    testId: number | string,
    attemptId: number | string,
    deadline?: string,
  ) => string;
  /** Trang kết quả sau khi nộp. */
  result: (testId: number | string, attemptId: number | string) => string;
};

export function testRoutes(basePath: string): TestRoutes {
  return {
    list: basePath,
    detail: (testId) => `${basePath}/${testId}`,
    attempt: (testId, attemptId, deadline) =>
      `${basePath}/${testId}/attempt/${attemptId}` +
      (deadline ? `?deadline=${encodeURIComponent(deadline)}` : ""),
    result: (testId, attemptId) => `${basePath}/${testId}/result/${attemptId}`,
  };
}
