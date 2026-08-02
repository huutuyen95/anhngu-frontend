"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getAttempt } from "@/lib/api/attempts";
import type { AttemptDetail } from "@/lib/types/attempt";
import { ButtonLink } from "@/components/ui/button";
import { AttemptDetailView } from "@/features/grading/attempt-detail";

function ResultDetailView({ id }: { id: number }) {
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getAttempt(id)
      .then((r) => setAttempt(r.attempt))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl">
      <ButtonLink href="/teacher/results" variant="ghost" size="sm" iconLeft={<ArrowLeft className="size-4" />}>
        Kết quả làm bài
      </ButtonLink>

      <div className="mt-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-32 animate-pulse rounded-2xl bg-surface-alt" />
            <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" />
          </div>
        ) : notFound || !attempt ? (
          <div className="rounded-2xl bg-danger-soft p-6 text-center text-danger">Không tìm thấy bài làm này.</div>
        ) : (
          <AttemptDetailView initial={attempt} />
        )}
      </div>
    </div>
  );
}

export default function ResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResultDetailView id={Number(id)} />;
}
