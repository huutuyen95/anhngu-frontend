"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { SubmitConfirmDialog, missingNumbers } from "@/features/tests/submit-confirm";
import { Modal } from "@/components/ui/modal";
import {
  formatRemaining,
  type Part,
  type Question,
  type Section,
  type TestDetail,
  type TestAttemptState,
} from "@/features/tests/use-test-attempt";

/* ────────────────────────────────────────────────────────────────────────────
   Màn làm bài ĐỀ WRITING (S8) — một cột, mỗi câu hỏi là một khung khép kín bao
   trọn đề bài + trình soạn thảo riêng của câu đó. Không sidebar, không rail
   phụ, không bài mẫu. Chỉ dùng cho `test.skill === "writing"` — logic vòng đời
   lượt làm (autosave, đếm giờ, chống thoát tab, nộp bài) lấy từ `useTestAttempt`.
   ──────────────────────────────────────────────────────────────────────────── */

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function WritingTestAttempt({
  attempt,
  test,
}: {
  attempt: TestAttemptState;
  test: TestDetail;
}) {
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [wordCounts, setWordCounts] = useState<Record<number, number>>({});

  const sortedParts = useMemo(() => test.parts.slice().sort((a, b) => a.order - b.order), [test]);

  const groups = useMemo(() => buildGroups(sortedParts), [sortedParts]);
  const allQuestions = useMemo(() => groups.flatMap((g) => g.questions), [groups]);
  const questionIndex = useMemo(
    () => new Map(allQuestions.map((q, i) => [q.id, i + 1])),
    [allQuestions],
  );
  const totalSections = groups.length;
  const showPartHeader = sortedParts.length > 1;
  const showSectionHeader = totalSections > 1;

  // Không dùng hasAnswer() ở đây: answer_text lưu HTML từ tiptap, rỗng vẫn ra "<p></p>"
  // (khác rỗng theo hasAnswer) — đếm theo số từ thực tế mới đúng trạng thái "đã viết".
  // Danh sách câu còn trống — hiện rõ trong hộp xác nhận nộp bài để em không bỏ sót.
  // Đếm theo SỐ TỪ chứ không dùng hasAnswer(): answer_text lưu HTML từ tiptap, ô rỗng
  // vẫn ra "<p></p>" nên hasAnswer sẽ tưởng là đã viết.
  const missingList = missingNumbers(allQuestions, (q) => (wordCounts[q.id] ?? 0) > 0);

  const remainingMs = attempt.deadline ? Math.max(0, attempt.deadline - attempt.now) : null;
  const urgent = remainingMs !== null && remainingMs < 5 * 60_000;

  function setWordCount(questionId: number, count: number) {
    setWordCounts((prev) => (prev[questionId] === count ? prev : { ...prev, [questionId]: count }));
  }

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-[18px] pb-2">
      {/* ── Hàng tiêu đề ── */}
      <div className="flex items-center gap-3.5">
        <Link
          href={attempt.routes.list}
          className="shrink-0 text-[13px] font-bold text-[#8A8073] transition-colors hover:text-[#D65F27]"
        >
          ← Thoát
        </Link>
        <h1
          className="min-w-0 truncate font-display text-[22px] font-bold leading-tight"
          style={{ color: "#3A3330" }}
        >
          {test.title}
        </h1>
        <span
          className="shrink-0 rounded-full px-3 py-[5px] text-[11.5px] font-bold"
          style={{ background: "#FDEBDD", color: "#D65F27" }}
        >
          {`BÀI VIẾT · ${allQuestions.length} CÂU`}
        </span>

        {/* Đồng hồ · trạng thái lưu · Nộp bài nằm CÙNG một hàng. Đừng xếp chồng đồng hồ
            với dòng trạng thái thành cột: cột đó cao hơn nút 42px nên căn giữa xong
            đồng hồ bị trồi lên, lệch hẳn với nút Nộp bài. */}
        <div className="ml-auto flex shrink-0 items-center gap-3.5">
          <div
            className="flex h-[42px] items-center rounded-full px-4"
            style={{ background: "#FFFFFF", border: "1.5px solid #EFE7D4" }}
          >
            <span
              className="font-display text-[16px] font-bold tabular-nums"
              style={{ color: urgent ? "#C1442F" : "#3A3330" }}
            >
              {remainingMs !== null ? formatRemaining(remainingMs) : "Không giới hạn"}
            </span>
          </div>

          <p
            className="whitespace-nowrap text-[12px] font-semibold"
            style={{ color: "#B5AC9C" }}
          >
            {attempt.savedAt ? `Đã lưu nháp ${attempt.savedAt}` : "Chưa lưu nháp"}
          </p>

          <button
            type="button"
            onClick={() => attempt.setConfirmSubmit(true)}
            disabled={attempt.submitting}
            className="flex h-[42px] items-center rounded-full px-6 text-sm font-bold text-white transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-60"
            style={{ background: "#F2793B", boxShadow: "0 3px 0 #D65F27" }}
          >
            {attempt.submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      </div>

      {attempt.error && (
        <p className="text-sm font-semibold" style={{ color: "#C1442F" }}>
          {attempt.error}
        </p>
      )}

      {/* ── Part / Section / khung câu hỏi ── */}
      {groups.map((group) => {
        return (
          <div key={group.section.id} className="flex flex-col gap-3.5">
            {showPartHeader && group.isFirstOfPart && (
              <div className="flex items-center gap-2.5">
                <span
                  className="shrink-0 rounded-full px-3 py-1 font-display text-[12px] font-bold"
                  style={{ background: "#FDEBDD", color: "#D65F27" }}
                >
                  PART {group.partNumber}
                </span>
                {group.part.title?.trim() && (
                  <span className="shrink-0 font-display text-[15px] font-bold" style={{ color: "#3A3330" }}>
                    {group.part.title.trim()}
                  </span>
                )}
                <span className="h-[1.5px] flex-1" style={{ background: "#EFE7D4" }} />
              </div>
            )}

            {showSectionHeader && (
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.5px]"
                  style={{ color: "#8A8073" }}
                >
                  SECTION {group.sectionLetter}
                </span>
                {group.section.instruction?.trim() && (
                  <span className="text-[12px] font-semibold" style={{ color: "#B5AC9C" }}>
                    {group.section.instruction.trim()}
                  </span>
                )}
              </div>
            )}

            {group.questions.map((question) => (
              <WritingQuestionCard
                key={question.id}
                question={question}
                index={questionIndex.get(question.id) ?? 0}
                initialHtml={attempt.answers[question.id]?.answer_text ?? ""}
                wordCount={wordCounts[question.id] ?? 0}
                active={activeQuestionId === question.id}
                savedAt={attempt.savedAt}
                onFocusEditor={() => setActiveQuestionId(question.id)}
                onBlurEditor={() =>
                  setActiveQuestionId((cur) => (cur === question.id ? null : cur))
                }
                onChangeHtml={(html) => attempt.setTextAnswer(question.id, html)}
                onChangeWordCount={(count) => setWordCount(question.id, count)}
              />
            ))}
          </div>
        );
      })}

      {/* ── Hàng hành động cuối trang ── */}
      <div className="flex items-center gap-4 pt-1">
        <p className="text-[12.5px] font-semibold" style={{ color: "#8A8073" }}>
          Nộp bài rồi em vẫn xem lại được, nhưng không sửa được nữa.
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={attempt.saveNow}
            className="flex h-11 items-center rounded-full px-6 text-sm font-bold transition-colors"
            style={{ background: "#FFFFFF", border: "1.5px solid #EFE7D4", color: "#3A3330" }}
          >
            Lưu nháp
          </button>
          <button
            type="button"
            onClick={() => attempt.setConfirmSubmit(true)}
            disabled={attempt.submitting}
            className="flex h-11 items-center rounded-full px-6 text-sm font-bold text-white transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-60"
            style={{ background: "#F2793B", boxShadow: "0 3px 0 #D65F27" }}
          >
            {attempt.submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      </div>

      <SubmitConfirmDialog
        open={attempt.confirmSubmit}
        onClose={() => attempt.setConfirmSubmit(false)}
        onConfirm={() => {
          attempt.setConfirmSubmit(false);
          attempt.handleSubmit();
        }}
        missing={missingList}
        total={allQuestions.length}
        verb="chưa viết"
      />

      <Modal
        open={attempt.exitWarn !== null && !attempt.autoSubmitted}
        onClose={() => attempt.setExitWarn(null)}
        title="Em vừa rời khỏi màn thi"
        footer={
          <button
            type="button"
            onClick={() => attempt.setExitWarn(null)}
            className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
          >
            Tiếp tục làm bài
          </button>
        }
      >
        {attempt.exitWarn && (
          <div className="text-[14.5px] leading-relaxed text-text-secondary">
            <p>
              Em đã rời khỏi màn làm bài{" "}
              <b className="text-[#C1442F]">
                {attempt.exitWarn.count}/{attempt.exitWarn.limit}
              </b>{" "}
              lần.
            </p>
            <p className="mt-2">
              {attempt.exitWarn.count >= attempt.exitWarn.limit
                ? "Đây là lần cuối được phép — rời thêm một lần nữa, bài sẽ TỰ ĐỘNG NỘP ngay."
                : `Rời khỏi màn thi quá ${attempt.exitWarn.limit} lần thì bài sẽ tự động nộp. Em tập trung làm bài nhé!`}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={attempt.autoSubmitted}
        onClose={attempt.goToResult}
        title="Bài đã được nộp"
        footer={
          <button
            type="button"
            onClick={attempt.goToResult}
            className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-bold"
          >
            Xem kết quả
          </button>
        }
      >
        <div className="text-[14.5px] leading-relaxed text-text-secondary">
          <p>
            Em đã rời khỏi màn thi quá{" "}
            <b className="text-[#C1442F]">{attempt.exitLimit}</b> lần cho phép, nên hệ thống đã{" "}
            <b className="text-[#C1442F]">tự động nộp bài</b>.
          </p>
          <p className="mt-2">Em xem lại kết quả nhé.</p>
        </div>
      </Modal>
    </div>
  );
}

/* ── Gom part/section/câu theo thứ tự hiển thị (chỉ giữ section có câu) ── */

type Group = {
  part: Part;
  partNumber: number;
  section: Section;
  sectionLetter: string;
  isFirstOfPart: boolean;
  questions: Question[];
};

function buildGroups(sortedParts: Part[]): Group[] {
  const groups: Group[] = [];
  let sectionSeen = 0;
  sortedParts.forEach((part, partIdx) => {
    let isFirstOfPart = true;
    part.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((section) => {
        const questions = section.questions.slice().sort((a, b) => a.order - b.order);
        if (questions.length === 0) return;
        groups.push({
          part,
          partNumber: partIdx + 1,
          section,
          sectionLetter: String.fromCharCode(65 + sectionSeen),
          isFirstOfPart,
          questions,
        });
        sectionSeen += 1;
        isFirstOfPart = false;
      });
  });
  return groups;
}

/* ── Khung câu hỏi: đề bài + trình soạn thảo riêng ── */

function WritingQuestionCard({
  question,
  index,
  initialHtml,
  wordCount,
  active,
  savedAt,
  onFocusEditor,
  onBlurEditor,
  onChangeHtml,
  onChangeWordCount,
}: {
  question: Question;
  index: number;
  initialHtml: string;
  wordCount: number;
  active: boolean;
  savedAt: string | null;
  onFocusEditor: () => void;
  onBlurEditor: () => void;
  onChangeHtml: (html: string) => void;
  onChangeWordCount: (count: number) => void;
}) {
  const filled = wordCount > 0;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false })],
    content: initialHtml,
    onCreate: ({ editor }) => onChangeWordCount(countWords(editor.state.doc.textContent)),
    onUpdate: ({ editor }) => {
      onChangeHtml(editor.getHTML());
      onChangeWordCount(countWords(editor.state.doc.textContent));
    },
    onFocus: onFocusEditor,
    onBlur: onBlurEditor,
    editorProps: {
      attributes: {
        class: "writing-editor-content outline-none",
        "aria-label": `Bài viết câu ${index}`,
      },
    },
  });

  return (
    <article
      className="overflow-hidden rounded-[22px] bg-white"
      style={{ border: `2px solid ${active ? "#F2793B" : "#EFE7D4"}` }}
    >
      {/* Header */}
      <div
        className="px-6 py-5"
        style={{
          background: active ? "#FDEBDD" : "#FDFBF3",
          borderBottom: `1.5px solid ${active ? "#F7C6A4" : "#EFE7D4"}`,
        }}
      >
        <div className="flex items-center gap-[11px]">
          <span
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] font-display text-[13.5px] font-bold"
            style={filled ? { background: "#F2793B", color: "#FFFFFF" } : { background: "#F5EFDF", color: "#8A8073" }}
          >
            {index}
          </span>
          <span className="text-[11.5px] font-bold uppercase tracking-[0.3px]" style={{ color: "#8A8073" }}>
            {`CÂU ${index} · VIẾT LUẬN`}
          </span>
          <span
            className="ml-auto shrink-0 rounded-full px-3 py-[5px] text-[11px] font-bold"
            style={filled ? { background: "#F1F8DE", color: "#5E8418" } : { background: "#F5EFDF", color: "#8A8073" }}
          >
            {filled ? "Đang viết" : "Chưa viết"}
          </span>
        </div>

        <p
          className="mt-2.5 font-display text-[19px] font-bold leading-[1.45]"
          style={{ color: "#3A3330", textWrap: "pretty", whiteSpace: "pre-line" }}
        >
          {question.content}
        </p>
      </div>

      {/* Thanh công cụ */}
      {editor && (
        <div
          className="flex items-center gap-1.5 px-4 py-[9px]"
          style={{ background: "#FDFBF3", borderBottom: "1.5px solid #EFE7D4" }}
        >
          <ToolButton label="Đậm" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <span className="font-bold">B</span>
          </ToolButton>
          <ToolButton label="Nghiêng" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <span className="italic">I</span>
          </ToolButton>
          <ToolButton label="Gạch chân" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <span className="underline">U</span>
          </ToolButton>
          <ToolButton
            label="Danh sách"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •
          </ToolButton>
          <ToolButton
            label="Danh sách số"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolButton>
          <ToolButton label="Hoàn tác" onClick={() => editor.chain().focus().undo().run()}>
            ↶
          </ToolButton>
          <ToolButton label="Làm lại" onClick={() => editor.chain().focus().redo().run()}>
            ↷
          </ToolButton>
          <span className="ml-auto shrink-0 text-[11.5px] font-semibold" style={{ color: "#B5AC9C" }}>
            Em viết trực tiếp vào khung bên dưới
          </span>
        </div>
      )}

      {/* Vùng soạn thảo */}
      <div className="relative">
        {!filled && (
          <p
            className="pointer-events-none absolute left-[26px] top-[22px] text-[15.5px]"
            style={{ color: "#B5AC9C" }}
          >
            Bắt đầu viết bài của em ở đây…
          </p>
        )}
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="min-h-[260px] px-[26px] py-[22px]" />
        )}
      </div>

      {/* Chân khung */}
      <div
        className="flex items-center gap-3 px-6 py-[13px]"
        style={{ background: "#FDFBF3", borderTop: "1.5px solid #EFE7D4" }}
      >
        <span
          className="rounded-full px-3 py-1 text-[11.5px] font-bold"
          style={filled ? { background: "#F1F8DE", color: "#5E8418" } : { background: "#F5EFDF", color: "#8A8073" }}
        >
          {`${wordCount} từ`}
        </span>
        <span className="ml-auto shrink-0 text-[11.5px] font-semibold" style={{ color: "#B5AC9C" }}>
          {filled ? (savedAt ? `Đã lưu nháp ${savedAt}` : "Chưa lưu nháp") : "Chưa có nội dung"}
        </span>
      </div>
    </article>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center rounded-[10px] px-1.5 text-[13px] font-bold transition-colors"
      style={
        active
          ? { background: "#FDEBDD", border: "1.5px solid #F2793B", color: "#D65F27" }
          : { background: "#FFFFFF", border: "1.5px solid #EFE7D4", color: "#8A8073" }
      }
    >
      {children}
    </button>
  );
}
