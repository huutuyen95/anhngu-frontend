"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type Option = { id: number; label: string; content: string; is_correct: boolean };

type Question = {
  id: number;
  order: number;
  type: "multiple_choice" | "fill_blank" | "select" | "upload";
  content: string;
  audio_url: string | null;
  explanation: string | null;
  options: Option[];
  // Chỉ có ở câu fill_blank — đáp án đúng lưu trên question, không phải options
  correct_answer_text?: string | null;
};

type Section = {
  id: number;
  instruction: string | null;
  passage: string | null;
  audio_url: string | null;
  order: number;
  questions: Question[];
};

type Part = {
  id: number;
  title: string;
  order: number;
  sections: Section[];
};

type ResultAnswer = {
  question_id: number;
  question_option_id: number | null;
  answer_text: string | null;
  is_correct: boolean | null;
};

type Result = {
  id: number;
  total_score: number;
  correct_count: number;
  question_count: number;
  is_new_best?: boolean;
  previous_best_score?: number | null;
  test: {
    id: number;
    title: string;
    total_score: number;
    parts: Part[];
  };
  answers: ResultAnswer[];
};

// Ưu tiên payload trả về ngay từ lúc nộp bài (lưu ở sessionStorage) — vì attempt điểm
// thấp có thể đã bị BE xoá nên không phải lúc nào GET result cũng còn dùng được.
function readStoredResult(attemptId: string): Result | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(`test-result-${attemptId}`);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Result;
  } catch {
    return null;
  }
}

export default function TestResultPage() {
  const { attemptId } = useParams<{ id: string; attemptId: string }>();

  const [result, setResult] = useState<Result | null>(() =>
    readStoredResult(attemptId),
  );
  const [error, setError] = useState<string | null>(null);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (readStoredResult(attemptId)) return;

    api<Result>(`/attempts/${attemptId}/result`)
      .then(setResult)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Không tải được kết quả."),
      );
  }, [attemptId]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  const answersByQuestion = new Map(
    result.answers.map((answer) => [answer.question_id, answer]),
  );

  const allQuestions = result.test.parts
    .flatMap((part) => part.sections)
    .flatMap((section) => section.questions)
    .slice()
    .sort((a, b) => a.order - b.order);

  function scrollToQuestion(questionId: number) {
    questionRefs.current[questionId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/tests"
        className="mb-4 inline-block text-sm text-slate-500 hover:underline"
      >
        ← Quay lại danh sách đề
      </Link>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-500">{result.test.title}</p>
        <p className="my-2 text-5xl font-bold text-blue-950">
          {result.total_score}
          <span className="text-lg font-medium text-slate-400">
            {" "}
            / {result.test.total_score}
          </span>
        </p>
        <p className="text-sm text-slate-600">
          {result.correct_count} / {result.question_count} câu đúng
        </p>
        {result.is_new_best === false && result.previous_best_score != null && (
          <p className="mt-2 text-xs text-slate-500">
            Điểm lần này thấp hơn kỷ lục ({result.previous_best_score}đ) nên hệ thống
            giữ điểm cao nhất.
          </p>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Danh sách câu</h2>
        <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
          {allQuestions.map((question) => {
            const answer = answersByQuestion.get(question.id);
            const correct = answer?.is_correct;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => scrollToQuestion(question.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-white ${
                  correct === true
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : correct === false
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-slate-300 hover:bg-slate-400"
                }`}
              >
                {question.order}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-8">
        {result.test.parts
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((part) => (
            <section key={part.id}>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                {part.title}
              </h2>

              <div className="space-y-6">
                {part.sections
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <div
                      key={section.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      {section.instruction && (
                        <p className="mb-2 text-sm font-medium text-slate-700">
                          {section.instruction}
                        </p>
                      )}
                      {section.passage && (
                        <p className="mb-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                          {section.passage}
                        </p>
                      )}
                      {section.audio_url && (
                        <audio
                          controls
                          src={section.audio_url}
                          className="mb-4 w-full"
                        />
                      )}

                      <div className="space-y-6">
                        {section.questions
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((question) => {
                            const answer = answersByQuestion.get(question.id);
                            const correctAnswerText =
                              question.options.find((o) => o.is_correct)
                                ?.content ?? question.correct_answer_text;

                            return (
                              <div
                                key={question.id}
                                ref={(el) => {
                                  questionRefs.current[question.id] = el;
                                }}
                                className="scroll-mt-24"
                              >
                                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                                  <span>
                                    {question.order}. {question.content}
                                  </span>
                                  {answer?.is_correct === true && (
                                    <span className="text-emerald-600">✓</span>
                                  )}
                                  {answer?.is_correct === false && (
                                    <span className="text-red-600">✗</span>
                                  )}
                                </p>

                                {question.audio_url && (
                                  <audio
                                    controls
                                    src={question.audio_url}
                                    className="mb-3 w-full"
                                  />
                                )}

                                {(question.type === "multiple_choice" ||
                                  question.type === "select") && (
                                  <div className="space-y-2">
                                    {question.options.map((option) => {
                                      const isChosen =
                                        answer?.question_option_id === option.id;
                                      const isCorrectOption = option.is_correct;
                                      const cls = isCorrectOption
                                        ? "border-emerald-300 bg-emerald-50"
                                        : isChosen
                                          ? "border-red-300 bg-red-50"
                                          : "border-slate-200";
                                      return (
                                        <div
                                          key={option.id}
                                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${cls}`}
                                        >
                                          <span className="font-medium text-slate-500">
                                            {option.label}.
                                          </span>
                                          <span className="text-slate-800">
                                            {option.content}
                                          </span>
                                          {isChosen && (
                                            <span className="ml-auto text-xs text-slate-500">
                                              Đã chọn
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {question.type === "fill_blank" && (
                                  <div className="space-y-2">
                                    <div
                                      className={`rounded-lg border px-3 py-2 text-sm ${
                                        answer?.is_correct
                                          ? "border-emerald-300 bg-emerald-50"
                                          : "border-red-300 bg-red-50"
                                      }`}
                                    >
                                      Bạn trả lời:{" "}
                                      {answer?.answer_text || (
                                        <span className="italic text-slate-400">
                                          (bỏ trống)
                                        </span>
                                      )}
                                    </div>
                                    {!answer?.is_correct && correctAnswerText && (
                                      <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
                                        Đáp án đúng: {correctAnswerText}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {question.explanation && (
                                  <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                                    <p className="mb-1 font-medium">Lời giải</p>
                                    <p>{question.explanation}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
