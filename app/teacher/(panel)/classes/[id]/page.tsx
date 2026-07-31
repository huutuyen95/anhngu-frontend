"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getClassroom } from "@/lib/api/classrooms";
import type { Classroom } from "@/lib/types/classroom";
import { ClassHeader, type ClassTab } from "@/features/classes/class-header";
import { OverviewTab } from "@/features/classes/tabs/overview-tab";
import { AssignTab } from "@/features/classes/tabs/assign-tab";
import { CommentsTab } from "@/features/classes/tabs/comments-tab";
import { ReportTab } from "@/features/classes/tabs/report-tab";
import { StudentsTab } from "@/features/classes/tabs/students-tab";

const VALID: ClassTab[] = ["overview", "assign", "comments", "report", "students"];

function ClassDetailView({ id }: { id: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab") as ClassTab | null;
  const tab: ClassTab = tabParam && VALID.includes(tabParam) ? tabParam : "overview";

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    getClassroom(id)
      .then((r) => setClassroom(r.classroom))
      .catch(() => setClassroom(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  function setTab(t: ClassTab) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", t);
    router.replace(`/teacher/classes/${id}?${next.toString()}`, { scroll: false });
  }

  // preselect buổi khi chuyển từ Tổng quan sang Giao bài
  const focusSession = params.get("session");

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-alt" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-alt" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-danger-soft p-6 text-center text-danger">
          Không tìm thấy lớp học này.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ClassHeader classroom={classroom} tab={tab} onTab={setTab} />
      {tab === "overview" && (
        <OverviewTab classId={id} onGoAssign={(sid) => router.replace(`/teacher/classes/${id}?tab=assign&session=${sid}`, { scroll: false })} onGoTab={setTab} />
      )}
      {tab === "assign" && <AssignTab classId={id} className={classroom.name} focusSession={focusSession ? Number(focusSession) : null} />}
      {tab === "comments" && <CommentsTab classId={id} />}
      {tab === "report" && <ReportTab classId={id} />}
      {tab === "students" && <StudentsTab classId={id} onChanged={reload} />}
    </div>
  );
}

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}>
      <ClassDetailView id={Number(id)} />
    </Suspense>
  );
}
