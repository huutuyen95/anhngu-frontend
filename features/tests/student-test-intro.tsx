"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { startAttempt } from "@/lib/api/tests";
import { testRoutes } from "@/features/tests/routes";

type TestMeta = {
  id: number;
  title: string;
  skill: string;
  duration_minutes: number;
  total_score: number;
  parts: { sections: { questions: unknown[] }[] }[];
};

/**
 * Trang giới thiệu đề trước khi làm bài. Dùng lại cho mọi root (thư viện, lớp học)
 * — điều hướng nội bộ tính theo `basePath`, không hardcode "/library".
 *
 * `missionId` chỉ có khi vào từ lớp học: nó quyết định lượt làm được tính là BÀI CÔ GIAO
 * hay em TỰ LUYỆN — hai nguồn tách hẳn nhau (xem `startAttempt`).
 */
export function StudentTestIntro({
  basePath,
  testId,
  missionId = null,
}: {
  basePath: string;
  testId: string;
  missionId?: number | null;
}) {
  const router = useRouter();
  const routes = useMemo(() => testRoutes(basePath), [basePath]);

  const [test, setTest] = useState<TestMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api<TestMeta>(`/tests/${testId}`)
      .then(setTest)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Không tải được đề thi."),
      );
  }, [testId]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const attempt = await startAttempt(testId, missionId);
      router.push(routes.attempt(testId, attempt.attempt_id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không bắt đầu được bài làm.");
      setStarting(false);
    }
  }

  if (error && !test) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!test) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  const questionCount = test.parts
    .flatMap((part) => part.sections)
    .flatMap((section) => section.questions).length;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={routes.list}
        className="mb-4 inline-block text-sm text-slate-500 hover:underline"
      >
        ← Quay lại danh sách đề
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">
          {test.title}
        </h1>
        <p className="mb-6 text-sm text-slate-500">{test.skill}</p>

        <dl className="mb-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs text-slate-500">Thời lượng</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {test.duration_minutes}′
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Số câu</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {questionCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Điểm tối đa</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {test.total_score}
            </dd>
          </div>
        </dl>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="w-full rounded-lg bg-blue-950 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {starting ? "Đang bắt đầu..." : "Bắt đầu làm bài"}
        </button>
      </div>
    </div>
  );
}
