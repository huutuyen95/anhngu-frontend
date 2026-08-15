"use client";

import { Plus, Trash2, Copy } from "lucide-react";
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
const SELECT_DEFAULTS = ["True", "False", "Not Given"];

export type DraftOption = { _cid: string; id?: number; label: string | null; content: string; is_correct: boolean };
export type DraftQuestion = {
  _cid: string;
  id?: number;
  type: QuestionType;
  content: string | null;
  /** Gợi ý hiện cho học viên lúc đang làm bài (khác `explanation` = lời giải sau khi nộp). */
  hint?: string | null;
  explanation?: string | null;
  images: string[];
  record_limit_seconds: number | null;
  options: DraftOption[];
};

function relabel(options: DraftOption[]): DraftOption[] {
  return options.map((o, i) => ({ ...o, label: OPTION_LETTERS[i] ?? String(i + 1) }));
}
function opt(content = "", is_correct = false, label: string | null = null): DraftOption {
  return { _cid: crypto.randomUUID(), label, content, is_correct };
}

function optionsFor(type: QuestionType): DraftOption[] {
  if (type === "multiple_choice") return relabel([opt(), opt(), opt(), opt()]);
  if (type === "select") return SELECT_DEFAULTS.map((c, i) => opt(c, i === 0, null));
  if (type === "fill_blank") return [opt("", true)];
  return [];
}

export function newDraftQuestion(type: QuestionType): DraftQuestion {
  return { _cid: crypto.randomUUID(), type, content: "", hint: "", explanation: "", images: [], record_limit_seconds: null, options: optionsFor(type) };
}

type Props = {
  index: number;
  scorePerQuestion?: number;
  question: DraftQuestion;
  onChange: (next: DraftQuestion) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  disabled?: boolean;
};

export function QuestionEditor({ index, scorePerQuestion, question, onChange, onRemove, onDuplicate, disabled }: Props) {
  const t = question.type;
  const isMc = t === "multiple_choice";
  const isSelect = t === "select";
  const isFill = t === "fill_blank";
  const isSpeaking = t === "speaking";
  const isWriting = t === "writing";
  const hasOptions = isMc || isSelect;

  function setType(type: QuestionType) {
    if (type === question.type) return;
    onChange({ ...question, type, options: optionsFor(type), images: [], record_limit_seconds: null });
  }
  function updateOption(cid: string, patch: Partial<DraftOption>) {
    onChange({ ...question, options: question.options.map((o) => (o._cid === cid ? { ...o, ...patch } : o)) });
  }
  function setCorrect(cid: string) {
    onChange({ ...question, options: question.options.map((o) => ({ ...o, is_correct: o._cid === cid })) });
  }
  function addOption() {
    if (question.options.length >= 6) return;
    onChange({ ...question, options: isMc ? relabel([...question.options, opt()]) : [...question.options, opt()] });
  }
  function removeOption(cid: string) {
    if (question.options.length <= 2) return;
    const next = question.options.filter((o) => o._cid !== cid);
    onChange({ ...question, options: isMc ? relabel(next) : next });
  }
  // fill_blank: nhập nhiều đáp án chấp nhận, ngăn bằng "/".
  const fillValue = question.options.map((o) => o.content).filter(Boolean).join(" / ");
  function setFill(v: string) {
    const parts = v.split("/").map((s) => s.trim());
    onChange({ ...question, options: parts.map((p) => opt(p, true)) });
  }

  return (
    <div className="rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
          Câu {index + 1} · {QUESTION_TYPE_LABEL[t]}
          {scorePerQuestion != null && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand">{scorePerQuestion.toFixed(1)}đ</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <select value={t} onChange={(e) => setType(e.target.value as QuestionType)} disabled={disabled}
            className="h-8 rounded-full border-[1.5px] border-border bg-surface px-2.5 text-xs text-text outline-none focus-visible:border-brand disabled:opacity-50">
            {Object.entries(QUESTION_TYPE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          {onDuplicate && <button onClick={onDuplicate} aria-label="Nhân bản câu hỏi" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-brand"><Copy className="size-3.5" /></button>}
          <button onClick={onRemove} disabled={disabled} aria-label="Xoá câu hỏi"
            className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="mt-2.5">
        <label className={labelClass}>{isWriting ? "Đề bài" : "Nội dung câu hỏi"}{isFill && " (dùng ___ cho chỗ trống)"}</label>
        <textarea value={question.content ?? ""} onChange={(e) => onChange({ ...question, content: e.target.value })} rows={isMc || isSelect ? 2 : 3} className={textareaClass} />
      </div>

      {hasOptions && (
        <div className="mt-3 flex flex-col gap-2">
          <span className={labelClass}>{isSelect ? "Lựa chọn — chọn ô cho đáp án đúng" : "Đáp án — chọn ô tròn cho đáp án đúng"}</span>
          {question.options.map((o) => (
            <div key={o._cid} className={cn("flex items-center gap-2 rounded-lg", o.is_correct && "bg-success-soft/60 px-1.5 py-1")}>
              <button type="button" role="radio" aria-checked={o.is_correct} aria-label={`Đánh dấu đáp án đúng`} onClick={() => setCorrect(o._cid)}
                className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-bold transition-colors",
                  o.is_correct ? "border-success bg-success text-white" : "border-border-strong bg-surface text-text-muted hover:border-success")}>
                {o.label ?? "✓"}
              </button>
              <input value={o.content} onChange={(e) => updateOption(o._cid, { content: e.target.value })} placeholder={isSelect ? "Nội dung lựa chọn" : `Đáp án ${o.label ?? ""}`}
                className="h-10 flex-1 rounded-xl border-[1.5px] border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-brand" />
              {o.is_correct && <span className="shrink-0 text-xs font-semibold text-success-bold">Đáp án đúng</span>}
              <button onClick={() => removeOption(o._cid)} disabled={question.options.length <= 2} aria-label="Xoá đáp án"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          {question.options.length < 6 && <Button variant="ghost" size="sm" iconLeft={<Plus className="size-3.5" />} onClick={addOption} className="self-start">Thêm lựa chọn</Button>}
        </div>
      )}

      {isFill && (
        <div className="mt-3">
          <label className={labelClass}>Đáp án đúng — nhiều đáp án ngăn bằng “/”</label>
          <input value={fillValue} onChange={(e) => setFill(e.target.value)} placeholder="taught / teached"
            className="h-11 w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 text-[15px] text-text outline-none focus-visible:border-brand" />
        </div>
      )}

      {isSpeaking && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className={labelClass}>Gợi ý cho học viên (không bắt buộc)</label>
            <textarea value={question.hint ?? ""} onChange={(e) => onChange({ ...question, hint: e.target.value })} rows={3}
              placeholder={"Ví dụ:\nYou should say:\n- where you went\n- who you went with\n- why you liked it"}
              className={textareaClass} />
            <p className="mt-1 text-[11.5px] text-text-muted">Hiện ngay cạnh đề bài lúc em làm bài — khác “Lời giải” (chỉ lộ sau khi nộp).</p>
          </div>
          <div><label className={labelClass}>Ảnh gợi ý (không bắt buộc)</label><ImageGridUpload images={question.images} onChange={(images) => onChange({ ...question, images })} /></div>
          <div>
            <label className={labelClass}>Giới hạn thời lượng ghi âm</label>
            <select value={question.record_limit_seconds ?? ""} onChange={(e) => onChange({ ...question, record_limit_seconds: e.target.value === "" ? null : Number(e.target.value) })} className={selectClass}>
              <option value="">Không giới hạn</option>
              {RECORD_LIMITS.map((s) => <option key={s} value={s}>{s} giây</option>)}
            </select>
          </div>
        </div>
      )}

      {isWriting && (
        <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-text-secondary">Giới hạn từ & tiêu chí chấm đặt ở phần thông tin đề (áp dụng chung).</p>
      )}

      {!isSpeaking && (
        <div className="mt-3">
          <label className={labelClass}>Lời giải (không bắt buộc)</label>
          <textarea value={question.explanation ?? ""} onChange={(e) => onChange({ ...question, explanation: e.target.value })} rows={2} className={textareaClass} />
        </div>
      )}
    </div>
  );
}
