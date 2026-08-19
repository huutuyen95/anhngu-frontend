"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { startAttempt } from "@/lib/api/tests";
import { testRoutes } from "@/features/tests/routes";
import { OriginBanner } from "@/features/tests/attempt-origin";
import { AddToMissionButton } from "@/features/missions/add-to-mission-button";
import { SKILL_LABEL, type Skill } from "@/lib/types/test";
import type { Mission } from "@/lib/types/mission";

/** Tóm tắt các lượt em đã làm đề này — cùng hình dạng với `attempt` ở danh sách đề. */
type AttemptSummary = {
  id: number;
  /** Lượt ĐÃ NỘP gần nhất — khác `id` khi em đang làm dở một lượt mới. */
  last_result_id: number | null;
  status: "in_progress" | "pending_review" | "submitted" | "graded";
  bucket: "todo" | "doing" | "done" | "grading";
  best_score: number | null;
  attempt_count: number;
  last_attempted_at: string | null;
  answered_count: number | null;
  question_count: number | null;
};

type TestMeta = {
  id: number;
  title: string;
  skill: Skill;
  duration_minutes: number;
  total_score: number;
  parts: { sections: { questions: unknown[] }[] }[];
  /** Nhiệm vụ tự đặt của em cho đề này (null = chưa thêm). */
  mission: Mission | null;
  /** Lượt em đã làm đề này (null = chưa làm lần nào). */
  attempt: AttemptSummary | null;
};

const SKILL_COLOR: Record<string, { fg: string; bg: string }> = {
  reading: { fg: "#D65F27", bg: "#FDEBDD" },
  listening: { fg: "#2380A8", bg: "#E4F5FD" },
  writing: { fg: "#8A6A3A", bg: "#F5EFDF" },
  speaking: { fg: "#A8437F", bg: "#F9E6F2" },
  mixed: { fg: "#6B4FB8", bg: "#EFE7FD" },
};

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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
    return <p className="text-sm font-semibold text-[#C1442F]">{error}</p>;
  }

  if (!test) {
    return <p className="text-sm text-text-secondary">Đang tải...</p>;
  }

  const questionCount = test.parts
    .flatMap((part) => part.sections)
    .flatMap((section) => section.questions).length;

  const attempt = test.attempt;
  const doing = attempt?.bucket === "doing";
  // Đã nộp ít nhất một lần → cho em xem lại kết quả trước khi quyết định làm lại.
  // Dùng `last_result_id` chứ không phải `id`: đang làm dở thì `id` là lượt dang dở,
  // mở trang kết quả của nó sẽ 404.
  const resultId = attempt?.last_result_id ?? null;
  const skill = SKILL_COLOR[test.skill] ?? SKILL_COLOR.mixed;

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <Link
        href={routes.list}
        className="text-[13px] font-bold text-text-secondary transition-colors hover:text-brand-bold"
      >
        {missionId ? "← Về lớp học" : "← Đề thi"}
      </Link>

      {/*
        Nói rõ ngay từ trang giới thiệu em sắp làm bài cô giao hay bài tự luyện — lượt làm
        gắn nguồn ngay lúc bấm "Bắt đầu", sau đó không đổi được nữa.
      */}
      <OriginBanner
        origin={
          missionId
            ? { source: "assignment", mission: { id: missionId } }
            : { source: "library", mission: null }
        }
      />

      <div className="rounded-[20px] border-[1.5px] border-border bg-surface p-7">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.4px]"
          style={{ background: skill.bg, color: skill.fg }}
        >
          {SKILL_LABEL[test.skill] ?? "Đề thi"}
        </span>

        <h1 className="mt-3 font-display text-[28px] font-bold leading-tight text-text">
          {test.title}
        </h1>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Stat
            value={test.duration_minutes > 0 ? `${test.duration_minutes}′` : "∞"}
            label="Thời lượng"
          />
          <Stat value={String(questionCount)} label="Số câu" />
          <Stat value={formatScore(test.total_score)} label="Điểm tối đa" />
        </div>

        {/* Lượt trước — xem lại kết quả rồi hãy quyết định làm lại */}
        {attempt && (
          <div className="mt-5 rounded-[16px] border-[1.5px] border-border bg-surface-alt px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
              {doing ? "Em đang làm dở" : "Lần làm gần nhất"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {doing ? (
                <p className="text-sm font-semibold text-text">
                  Đã trả lời {attempt.answered_count ?? 0}/
                  {attempt.question_count ?? questionCount} câu
                </p>
              ) : (
                <>
                  <p className="font-display text-[19px] font-bold text-text">
                    {attempt.bucket === "grading"
                      ? "Chờ cô chấm"
                      : attempt.best_score !== null
                        ? `${formatScore(attempt.best_score)}/${formatScore(test.total_score)} điểm`
                        : "Đã nộp"}
                  </p>
                  {attempt.attempt_count > 1 && (
                    <span className="text-[12.5px] font-semibold text-text-muted">
                      Đã làm {attempt.attempt_count} lần
                    </span>
                  )}
                </>
              )}
              {attempt.last_attempted_at && (
                <span className="text-[12.5px] font-semibold text-text-muted">
                  {formatDate(attempt.last_attempted_at)}
                </span>
              )}
            </div>

            {resultId !== null && (
              <Link
                href={routes.result(test.id, resultId)}
                className="mt-3 inline-flex h-11 items-center rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold text-text transition-colors hover:border-brand hover:text-brand-bold"
              >
                Xem kết quả lần trước
              </Link>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-[13px] font-semibold text-[#C1442F]">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="flex h-12 items-center rounded-full bg-brand px-7 text-[15px] font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none disabled:opacity-60"
          >
            {starting
              ? "Đang mở đề…"
              : doing
                ? "Tiếp tục làm bài"
                : attempt
                  ? "Làm lại từ đầu"
                  : "Bắt đầu làm bài"}
          </button>

          {/* Bài cô giao đã có mục tiêu riêng của lớp — chỉ đề tự luyện mới thêm được
              vào "Nhiệm vụ 7 ngày tới" của em. */}
          {!missionId && (
            <AddToMissionButton type="test" contentId={test.id} initial={test.mission} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[104px] flex-1 rounded-[14px] bg-surface-alt px-4 py-3">
      <p className="font-display text-[19px] font-bold leading-none text-text">{value}</p>
      <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.5px] text-text-secondary">
        {label}
      </p>
    </div>
  );
}
