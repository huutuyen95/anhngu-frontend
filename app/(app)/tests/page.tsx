"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type TestAttempt = {
  status: "submitted";
  best_score: number;
  attempt_count: number;
  last_attempted_at: string;
} | null;

type Test = {
  id: number;
  title: string;
  slug: string;
  skill: string;
  duration_minutes: number;
  total_score: number;
  question_count: number;
  attempt: TestAttempt;
};

export default function TestsPage() {
  const [tests, setTests] = useState<Test[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Test[]>("/tests")
      .then(setTests)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Không tải được danh sách đề.",
        ),
      );
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!tests) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Đề thi</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => (
          <Link
            key={test.id}
            href={`/tests/${test.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {test.title}
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              {test.skill} · {test.duration_minutes} phút · {test.question_count} câu
            </p>
            {test.attempt ? (
              <Badge variant="success">
                Đã làm · {test.attempt.best_score}đ
                {test.attempt.attempt_count > 1
                  ? ` · ${test.attempt.attempt_count} lần`
                  : ""}
              </Badge>
            ) : (
              <Badge variant="secondary">Chưa làm</Badge>
            )}
          </Link>
        ))}
        {tests.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có đề thi nào.</p>
        )}
      </div>
    </div>
  );
}
