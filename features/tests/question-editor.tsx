"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/lib/types/test";
import { QUESTION_TYPE_LABEL } from "@/lib/types/test";
import { Button } from "@/components/ui/button";
import { ImageGridUpload } from "@/components/ui/image-upload";

const textareaClass =
  "w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const selectClass =
  "h-11 w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const labelClass = "mb-1.5 block text-xs font-semibold text-text-secondary";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const RECORD_LIMITS = [30, 60, 90, 120, 180];

export type DraftOption = { _cid: string; id?: number; label: string | null; content: string; is_correct: boolean };
export type DraftQuestion = {
  _cid: string;
  id?: number;
  type: QuestionType;
  content: string | null;
  explanation?: string | null;
  images: string[];
  record_limit_seconds: number | null;
  options: DraftOption[];
};

function relabel(options: DraftOption[]): DraftOption[] {
  return options.map((o, i) => ({ ...o, label: OPTION_LETTERS[i] ?? String(i + 1) }));
}

export function newDraftQuestion(type: QuestionType): DraftQuestion {
  const cid = crypto.randomUUID();
  return {
    _cid: cid,
    type,
    content: "",
    explanation: "",
    images: [],
    record_limit_seconds: null,
    options:
      type === "multiple_choice"
        ? relabel(
            Array.from({ length: 4 }, () => ({
              _cid: crypto.randomUUID(),
              label: null,
              content: "",
              is_correct: false,
            })),
          )
        : [],
  };
}

type Props = {
  index: number;
  question: DraftQuestion;
  onChange: (next: DraftQuestion) => void;
  onRemove: () => void;
};

export function QuestionEditor({ index, question, onChange, onRemove }: Props) {
  const isMc = question.type === "multiple_choice";
  const isSpeaking = question.type === "speaking";

  function setType(type: QuestionType) {
    if (type === question.type) return;
    onChange({
      ...question,
      type,
      options: type === "multiple_choice" ? newDraftQuestion("multiple_choice").options : [],
      images: [],
      record_limit_seconds: null,
    });
  }

  function updateOption(cid: string, patch: Partial<DraftOption>) {
    onChange({ ...question, options: question.options.map((o) => (o._cid === cid ? { ...o, ...patch } : o)) });
  }

  function setCorrect(cid: string) {
    onChange({ ...question, options: question.options.map((o) => ({ ...o, is_correct: o._cid === cid })) });
  }

  function addOption() {
    if (question.options.length >= 6) return;
    onChange({
      ...question,
      options: relabel([...question.options, { _cid: crypto.randomUUID(), label: null, content: "", is_correct: false }]),
    });
  }

  function removeOption(cid: string) {
    if (question.options.length <= 2) return;
    onChange({ ...question, options: relabel(question.options.filter((o) => o._cid !== cid)) });
  }

  return (
    <div className="rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-secondary">Câu {index + 1}</span>
        <div className="flex items-center gap-2">
          <select
            value={question.type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="h-8 rounded-full border-[1.5px] border-border bg-surface px-2.5 text-xs text-text outline-none focus-visible:border-brand"
          >
            {Object.entries(QUESTION_TYPE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={onRemove}
            aria-label="Xoá câu hỏi"
            className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-2.5">
        <label className={labelClass}>{isMc ? "Nội dung câu hỏi" : "Đề bài"}</label>
        <textarea
          value={question.content ?? ""}
          onChange={(e) => onChange({ ...question, content: e.target.value })}
          rows={isMc ? 2 : 3}
          className={textareaClass}
        />
      </div>

      {isMc && (
        <div className="mt-3 flex flex-col gap-2">
          <span className={labelClass}>Đáp án — chọn ô tròn cho đáp án đúng</span>
          {question.options.map((opt) => (
            <div key={opt._cid} className="flex items-center gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={opt.is_correct}
                aria-label={`Đánh dấu ${opt.label} là đáp án đúng`}
                onClick={() => setCorrect(opt._cid)}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-bold transition-colors",
                  opt.is_correct
                    ? "border-success bg-success text-white"
                    : "border-border-strong bg-surface text-text-muted hover:border-success",
                )}
              >
                {opt.label}
              </button>
              <input
                value={opt.content}
                onChange={(e) => updateOption(opt._cid, { content: e.target.value })}
                placeholder={`Đáp án ${opt.label}`}
                className="h-10 flex-1 rounded-xl border-[1.5px] border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              />
              <button
                onClick={() => removeOption(opt._cid)}
                disabled={question.options.length <= 2}
                aria-label="Xoá đáp án"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {question.options.length < 6 && (
            <Button variant="ghost" size="sm" iconLeft={<Plus className="size-3.5" />} onClick={addOption} className="self-start">
              Thêm đáp án
            </Button>
          )}

          <div className="mt-1">
            <label className={labelClass}>Lời giải (không bắt buộc)</label>
            <textarea
              value={question.explanation ?? ""}
              onChange={(e) => onChange({ ...question, explanation: e.target.value })}
              rows={2}
              className={textareaClass}
            />
          </div>
        </div>
      )}

      {isSpeaking && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className={labelClass}>Ảnh gợi ý (không bắt buộc)</label>
            <ImageGridUpload images={question.images} onChange={(images) => onChange({ ...question, images })} />
          </div>

          <div>
            <label className={labelClass}>Giới hạn thời lượng ghi âm</label>
            <select
              value={question.record_limit_seconds ?? ""}
              onChange={(e) =>
                onChange({
                  ...question,
                  record_limit_seconds: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={selectClass}
            >
              <option value="">Không giới hạn</option>
              {RECORD_LIMITS.map((s) => (
                <option key={s} value={s}>
                  {s} giây
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
