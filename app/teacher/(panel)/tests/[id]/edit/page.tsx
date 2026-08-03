"use client";

import { use, useCallback, useEffect, useState } from "react";
import { getTestStructure } from "@/lib/api/tests";
import type { TestDetail } from "@/lib/types/test";
import { TestEditor } from "@/features/tests/test-editor";

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

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-alt" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]"><div className="h-96 animate-pulse rounded-2xl bg-surface-alt" /><div className="h-96 animate-pulse rounded-2xl bg-surface-alt" /></div>
      </div>
    );
  }
  if (notFound || !test) {
    return <div className="mx-auto max-w-3xl"><div className="rounded-2xl bg-danger-soft p-6 text-center text-danger">Không tìm thấy đề thi này.</div></div>;
  }

  return <TestEditor id={id} initial={test} />;
}

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EditTestView id={Number(id)} />;
}
