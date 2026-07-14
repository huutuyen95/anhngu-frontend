"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type Option = { id: number; label: string; content: string };

type Question = {
  id: number;
  order: number;
  type: "multiple_choice" | "fill_blank" | "select" | "upload";
  content: string;
  audio_url: string | null;
  options: Option[];
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

type TestDetail = {
  id: number;
  title: string;
  skill: string;
  duration_minutes: number;
  total_score: number;
  parts: Part[];
};

type Answer = { question_id: number; question_option_id?: number; answer_text?: string };

const NAVY = "#0a2a5e";

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hasAnswer(answer: Answer | undefined): boolean {
  if (!answer) return false;
  if (answer.question_option_id !== undefined) return true;
  return !!answer.answer_text && answer.answer_text.trim() !== "";
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={active ? "#f59e0b" : "none"}
      stroke={active ? "#f59e0b" : "#94a3b8"}
      strokeWidth={2}
    >
      <path
        d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TestAttemptPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deadlineParam = searchParams.get("deadline");

  const [test, setTest] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const deadline = deadlineParam ? new Date(deadlineParam).getTime() : null;

  useEffect(() => {
    api<TestDetail>(`/tests/${id}`)
      .then(setTest)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Không tải được đề thi."),
      );
  }, [id]);

  function buildAnswersPayload(): Answer[] {
    return Object.values(answersRef.current);
  }

  async function saveAnswers() {
    const payload = buildAnswersPayload();
    if (payload.length === 0) return;
    try {
      await api(`/attempts/${attemptId}/answers`, {
        method: "PUT",
        body: JSON.stringify({ answers: payload }),
      });
    } catch {
      // Bỏ qua lỗi auto-save tạm thời — vẫn còn cơ hội lưu ở lần nộp bài cuối
    }
  }

  async function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await api(`/attempts/${attemptId}/answers`, {
        method: "PUT",
        body: JSON.stringify({ answers: buildAnswersPayload() }),
      });
      const result = await api(`/attempts/${attemptId}/submit`, { method: "POST" });
      try {
        sessionStorage.setItem(`test-result-${attemptId}`, JSON.stringify(result));
      } catch {
        // sessionStorage có thể đầy/bị chặn — không chặn luồng nộp bài, trang kết quả
        // sẽ fallback sang gọi GET /attempts/{id}/result
      }
      router.push(`/tests/${id}/result/${attemptId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không nộp được bài.");
      submittedRef.current = false;
      setSubmitting(false);
    }
  }

  function handleSubmitClick() {
    if (window.confirm("Bạn chắc chắn muốn nộp bài?")) {
      handleSubmit();
    }
  }

  // Đồng hồ đếm ngược, tự nộp khi hết giờ
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  // Auto-save định kỳ mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(() => saveAnswers(), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  function setOptionAnswer(questionId: number, optionId: number) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { question_id: questionId, question_option_id: optionId },
    }));
  }

  function setTextAnswer(questionId: number, text: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { question_id: questionId, answer_text: text },
    }));
  }

  function toggleMark(questionId: number) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function goToQuestion(questionId: number) {
    setCurrent(questionId);
    questionRefs.current[questionId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  const remainingLabel = deadline ? formatRemaining(deadline - now) : null;

  if (error && !test) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!test) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  const sortedParts = test.parts.slice().sort((a, b) => a.order - b.order);
  const allQuestions = sortedParts
    .flatMap((part) => part.sections.slice().sort((a, b) => a.order - b.order))
    .flatMap((section) => section.questions.slice().sort((a, b) => a.order - b.order));
  const questionIndex = new Map(allQuestions.map((q, i) => [q.id, i + 1]));

  const answeredCount = allQuestions.filter((q) => hasAnswer(answers[q.id])).length;
  const unansweredCount = allQuestions.length - answeredCount;
  const markedCount = marked.size;

  return (
    <div className="-m-6 min-h-screen bg-[#f6f7f9] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: NAVY }}>
          {test.title}
        </h1>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ⚙ Cài đặt
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[65%_1fr]">
        {/* Cột trái: câu hỏi */}
        <div className="min-w-0 space-y-8">
          {sortedParts.map((part) => (
            <section key={part.id}>
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                Part {part.order}: {part.title}
              </h2>

              <div className="space-y-6">
                {part.sections
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <div key={section.id} className="space-y-4">
                      {(section.instruction || section.passage || section.audio_url) && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          {section.instruction && (
                            <p className="mb-2 text-sm font-semibold text-slate-800">
                              Section {section.order}: {section.instruction}
                            </p>
                          )}
                          {section.passage && (
                            <p className="mb-3 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                              {section.passage}
                            </p>
                          )}
                          {section.audio_url && (
                            <audio controls src={section.audio_url} className="w-full" />
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        {section.questions
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((question) => (
                            <div
                              key={question.id}
                              id={`question-${question.id}`}
                              ref={(el) => {
                                questionRefs.current[question.id] = el;
                              }}
                              className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <span
                                  className="text-sm font-bold"
                                  style={{ color: NAVY }}
                                >
                                  Question {questionIndex.get(question.id)}:{" "}
                                  {question.content}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleMark(question.id)}
                                  aria-label="Đánh dấu câu hỏi"
                                  className="shrink-0 rounded-md p-1 hover:bg-slate-50"
                                >
                                  <BookmarkIcon active={marked.has(question.id)} />
                                </button>
                              </div>

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
                                    const selected =
                                      answers[question.id]?.question_option_id ===
                                      option.id;
                                    return (
                                      <label
                                        key={option.id}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                                          selected
                                            ? "border-[#0a2a5e] bg-blue-50"
                                            : "border-slate-200 hover:bg-slate-50"
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`question-${question.id}`}
                                          className="sr-only"
                                          checked={selected}
                                          onChange={() =>
                                            setOptionAnswer(question.id, option.id)
                                          }
                                        />
                                        <span
                                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                            selected
                                              ? "border-[#0a2a5e] bg-[#0a2a5e]"
                                              : "border-slate-300 bg-white"
                                          }`}
                                        >
                                          {selected && (
                                            <span className="text-[10px] font-bold leading-none text-white">
                                              ✓
                                            </span>
                                          )}
                                        </span>
                                        <span className="font-medium text-slate-500">
                                          {option.label}.
                                        </span>
                                        <span className="text-slate-800">
                                          {option.content}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {question.type === "fill_blank" && (
                                <input
                                  type="text"
                                  value={answers[question.id]?.answer_text ?? ""}
                                  onChange={(e) =>
                                    setTextAnswer(question.id, e.target.value)
                                  }
                                  placeholder="Nhập câu trả lời..."
                                  className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0a2a5e] focus:outline-none"
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        {/* Cột phải: bảng điều hướng */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {remainingLabel ? (
              <div className="flex items-center justify-center gap-2 rounded-full border-2 border-red-300 bg-red-50 px-4 py-2 text-red-600">
                <span>⏱</span>
                <span className="font-semibold">{remainingLabel} phút</span>
              </div>
            ) : (
              <div className="rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm text-slate-500">
                Không giới hạn thời gian
              </div>
            )}

            <h2 className="text-base font-bold text-slate-900">
              Danh sách câu hỏi
            </h2>

            <div className="space-y-1.5 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                Chưa trả lời ({unansweredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Đã trả lời ({answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-amber-500" />
                Đánh dấu ({markedCount})
              </div>
            </div>

            <p className="text-xs text-slate-400">Bấm vào ô để đến câu hỏi</p>

            <div className="grid grid-cols-4 gap-2">
              {allQuestions.map((question) => {
                const answered = hasAnswer(answers[question.id]);
                const isMarked = marked.has(question.id);
                const isCurrent = current === question.id;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => goToQuestion(question.id)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                      answered
                        ? "bg-blue-600 text-white border-transparent"
                        : "bg-slate-100 text-slate-600 border-transparent"
                    } ${isMarked ? "border-amber-500" : ""} ${
                      isCurrent ? "ring-2 ring-offset-2 ring-[#0a2a5e]" : ""
                    }`}
                  >
                    {questionIndex.get(question.id)}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={submitting}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
