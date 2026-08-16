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

/** Root của luồng đề thi trong khu Thư viện (tự luyện — không gắn lớp nào). */
export const LIBRARY_TESTS_ROOT = "/library/tests";

/**
 * Root của luồng đề thi trong một lớp. Bài làm ở đây gắn `mission_id` (truyền qua query
 * `?mission=`) nên tính vào tiến trình + báo cáo của lớp; cùng đề đó mở từ Thư viện thì
 * KHÔNG. Đừng trỏ nhiệm vụ trong lớp về `LIBRARY_TESTS_ROOT`.
 */
export function classTestsRoot(classId: number | string): string {
  return `/classes/${classId}/tests`;
}

export type TestRoutes = {
  /** Danh sách đề của root này. */
  list: string;
  /** Trang giới thiệu đề. */
  detail: (testId: number | string) => string;
  /** Màn làm bài. Hạn nộp KHÔNG truyền qua URL — màn thi tự lấy từ GET /attempts/{id}. */
  attempt: (testId: number | string, attemptId: number | string) => string;
  /** Trang kết quả sau khi nộp. */
  result: (testId: number | string, attemptId: number | string) => string;
};

/**
 * "Danh sách đề" của một root. Thư viện có trang danh sách thật; lớp học thì KHÔNG —
 * `/classes/{id}/tests` không phải một trang, nội dung buổi nằm ở trang lớp. Trả sai chỗ
 * này thì mọi nút "Thoát" / "Quay lại danh sách đề" trong luồng lớp đều rơi vào 404.
 */
function listHrefFor(basePath: string): string {
  const classId = basePath.match(/^\/classes\/([^/]+)\/tests$/)?.[1];

  return classId ? `/classes/${classId}` : basePath;
}

export function testRoutes(basePath: string): TestRoutes {
  return {
    list: listHrefFor(basePath),
    detail: (testId) => `${basePath}/${testId}`,
    attempt: (testId, attemptId) => `${basePath}/${testId}/attempt/${attemptId}`,
    result: (testId, attemptId) => `${basePath}/${testId}/result/${attemptId}`,
  };
}
