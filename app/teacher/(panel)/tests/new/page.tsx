"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Test } from "@/lib/types/test";
import { ButtonLink } from "@/components/ui/button";
import { TestForm } from "@/features/tests/test-form";

export default function NewTestPage() {
  const router = useRouter();

  function onSaved(test: Test) {
    toast.success("Đã tạo đề — giờ thêm câu hỏi cho đề nhé.");
    router.push(`/teacher/tests/${test.id}/edit`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ButtonLink href="/teacher/tests" variant="ghost" size="sm" iconLeft={<ArrowLeft className="size-4" />}>
        Đề thi
      </ButtonLink>
      <h1 className="mt-2 font-display text-2xl font-bold text-text">Tạo đề thi</h1>
      <p className="text-sm text-text-secondary">Nhập thông tin đề, sau đó thêm câu hỏi ở bước tiếp theo.</p>

      <div className="mt-5 rounded-2xl border-[1.5px] border-border bg-surface p-5">
        <TestForm mode="create" onSaved={onSaved} />
      </div>
    </div>
  );
}
