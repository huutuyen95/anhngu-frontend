"use client";

import { use, useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getTestStructure } from "@/lib/api/tests";
import type { TestDetail } from "@/lib/types/test";
import { ButtonLink } from "@/components/ui/button";
import { TestForm } from "@/features/tests/test-form";
import { StructureEditor } from "@/features/tests/structure-editor";

function EditTestView({ id }: { id: number }) {
  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getTestStructure(id)
      .then(({ test }) => setTest(test))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-alt" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-alt" />
      </div>
    );
  }

  if (notFound || !test) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-danger-soft p-6 text-center text-danger">Không tìm thấy đề thi này.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ButtonLink href="/teacher/tests" variant="ghost" size="sm" iconLeft={<ArrowLeft className="size-4" />}>
        Đề thi
      </ButtonLink>
      <h1 className="mt-2 font-display text-2xl font-bold text-text">Sửa đề thi</h1>

      <div className="mt-5 rounded-2xl border-[1.5px] border-border bg-surface p-5">
        <TestForm
          mode="edit"
          initial={test}
          onSaved={(t) => {
            setTest((prev) =>
              prev && {
                ...prev,
                title: t.title,
                skill: t.skill,
                duration_minutes: t.duration_minutes,
                total_score: t.total_score,
                word_limit: t.word_limit,
                rubric: t.rubric,
                is_published: t.is_published,
                scoring_method: t.scoring_method,
                is_combo: t.is_combo,
                thumbnail_url: t.thumbnail_url,
              },
            );
            toast.success("Đã lưu thông tin đề.");
          }}
        />
      </div>

      <div className="mt-6">
        <h2 className="font-display text-lg font-bold text-text">Câu hỏi</h2>
        <div className="mt-3">
          <StructureEditor testId={id} initial={test} />
        </div>
      </div>
    </div>
  );
}

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EditTestView id={Number(id)} />;
}
