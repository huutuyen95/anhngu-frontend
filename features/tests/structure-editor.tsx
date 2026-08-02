"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { saveTestStructure } from "@/lib/api/tests";
import type { QuestionType, TestPart, TestSection, TestDetail } from "@/lib/types/test";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/field";
import { AudioUpload } from "@/components/ui/audio-upload";
import { QuestionEditor, newDraftQuestion, type DraftQuestion } from "@/features/tests/question-editor";

const textareaClass =
  "w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const inputClass =
  "h-11 w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const labelClass = "mb-1.5 block text-xs font-semibold text-text-secondary";

type DraftSection = {
  _cid: string;
  id?: number;
  instruction: string | null;
  passage: string | null;
  audio_url: string | null;
  max_plays: number | null;
  questions: DraftQuestion[];
};

type DraftPart = {
  _cid: string;
  id?: number;
  title: string;
  sections: DraftSection[];
};

function fromServer(parts: TestPart[]): DraftPart[] {
  return parts.map((p) => ({
    _cid: `p-${p.id}`,
    id: p.id,
    title: p.title,
    sections: p.sections.map((s: TestSection) => ({
      _cid: `s-${s.id}`,
      id: s.id,
      instruction: s.instruction,
      passage: s.passage,
      audio_url: s.audio_url,
      max_plays: s.max_plays,
      questions: s.questions.map((q) => ({
        _cid: `q-${q.id}`,
        id: q.id,
        type: q.type,
        content: q.content,
        explanation: q.explanation ?? "",
        images: q.images ?? [],
        record_limit_seconds: q.record_limit_seconds ?? null,
        options: q.options.map((o) => ({
          _cid: `o-${o.id}`,
          id: o.id,
          label: o.label,
          content: o.content,
          is_correct: o.is_correct,
        })),
      })),
    })),
  }));
}

function newDraftSection(): DraftSection {
  return { _cid: crypto.randomUUID(), instruction: "", passage: "", audio_url: null, max_plays: null, questions: [] };
}

function newDraftPart(order: number): DraftPart {
  return { _cid: crypto.randomUUID(), title: `Phần ${order + 1}`, sections: [newDraftSection()] };
}

function move<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function StructureEditor({ testId, initial }: { testId: number; initial: TestDetail }) {
  const [parts, setParts] = useState<DraftPart[]>(() => fromServer(initial.parts));
  const [saving, setSaving] = useState(false);

  function updatePart(i: number, patch: Partial<DraftPart>) {
    setParts((p) => p.map((part, idx) => (idx === i ? { ...part, ...patch } : part)));
  }
  function updateSection(pi: number, si: number, patch: Partial<DraftSection>) {
    setParts((p) =>
      p.map((part, idx) =>
        idx !== pi
          ? part
          : { ...part, sections: part.sections.map((s, sidx) => (sidx === si ? { ...s, ...patch } : s)) },
      ),
    );
  }
  function updateQuestion(pi: number, si: number, qi: number, next: DraftQuestion) {
    setParts((p) =>
      p.map((part, idx) =>
        idx !== pi
          ? part
          : {
              ...part,
              sections: part.sections.map((s, sidx) =>
                sidx !== si ? s : { ...s, questions: s.questions.map((q, qidx) => (qidx === qi ? next : q)) },
              ),
            },
      ),
    );
  }

  function addPart() {
    setParts((p) => [...p, newDraftPart(p.length)]);
  }
  function removePart(i: number) {
    setParts((p) => p.filter((_, idx) => idx !== i));
  }
  function movePart(i: number, dir: -1 | 1) {
    setParts((p) => move(p, i, dir));
  }

  function addSection(pi: number) {
    setParts((p) => p.map((part, idx) => (idx === pi ? { ...part, sections: [...part.sections, newDraftSection()] } : part)));
  }
  function removeSection(pi: number, si: number) {
    setParts((p) =>
      p.map((part, idx) => (idx !== pi ? part : { ...part, sections: part.sections.filter((_, sidx) => sidx !== si) })),
    );
  }
  function moveSection(pi: number, si: number, dir: -1 | 1) {
    setParts((p) =>
      p.map((part, idx) => (idx !== pi ? part : { ...part, sections: move(part.sections, si, dir) })),
    );
  }

  function addQuestion(pi: number, si: number, type: QuestionType) {
    setParts((p) =>
      p.map((part, idx) =>
        idx !== pi
          ? part
          : {
              ...part,
              sections: part.sections.map((s, sidx) =>
                sidx !== si ? s : { ...s, questions: [...s.questions, newDraftQuestion(type)] },
              ),
            },
      ),
    );
  }
  function removeQuestion(pi: number, si: number, qi: number) {
    setParts((p) =>
      p.map((part, idx) =>
        idx !== pi
          ? part
          : {
              ...part,
              sections: part.sections.map((s, sidx) =>
                sidx !== si ? s : { ...s, questions: s.questions.filter((_, qidx) => qidx !== qi) },
              ),
            },
      ),
    );
  }

  const totalQuestions = parts.reduce((n, p) => n + p.sections.reduce((m, s) => m + s.questions.length, 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = parts.map((part, pi) => ({
        id: part.id,
        order: pi,
        title: part.title,
        sections: part.sections.map((section, si) => ({
          id: section.id,
          order: si,
          instruction: section.instruction || null,
          passage: section.passage || null,
          audio_url: section.audio_url || null,
          max_plays: section.max_plays ?? null,
          questions: section.questions.map((q, qi) => ({
            id: q.id,
            order: qi,
            type: q.type,
            content: q.content || null,
            explanation: q.explanation || null,
            images: q.type === "speaking" ? q.images : [],
            record_limit_seconds: q.type === "speaking" ? q.record_limit_seconds : null,
            options:
              q.type === "multiple_choice"
                ? q.options.map((o) => ({ id: o.id, label: o.label, content: o.content, is_correct: o.is_correct }))
                : [],
          })),
        })),
      }));
      const res = await saveTestStructure(testId, payload);
      setParts(fromServer(res.test.parts));
      toast.success("Đã lưu cấu trúc đề.");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Không lưu được cấu trúc đề — kiểm tra lại câu hỏi/đáp án.");
      } else {
        toast.error("Không lưu được cấu trúc đề.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{totalQuestions} câu hỏi</p>
        <Button size="sm" loading={saving} onClick={handleSave}>
          Lưu cấu trúc
        </Button>
      </div>

      {parts.map((part, pi) => (
        <div key={part._cid} className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <input
              value={part.title}
              onChange={(e) => updatePart(pi, { title: e.target.value })}
              className={inputClass + " flex-1 font-semibold"}
              placeholder="Tên phần"
            />
            <MoveButtons onUp={() => movePart(pi, -1)} onDown={() => movePart(pi, 1)} />
            <button
              onClick={() => removePart(pi)}
              aria-label="Xoá phần"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-l-[1.5px] border-border pl-4">
            {part.sections.map((section, si) => (
              <div key={section._cid} className="rounded-xl border-[1.5px] border-border bg-surface-alt/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-secondary">Section {si + 1}</span>
                  <div className="flex items-center gap-1">
                    <MoveButtons onUp={() => moveSection(pi, si, -1)} onDown={() => moveSection(pi, si, 1)} />
                    <button
                      onClick={() => removeSection(pi, si)}
                      aria-label="Xoá section"
                      className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Hướng dẫn</label>
                    <textarea
                      value={section.instruction ?? ""}
                      onChange={(e) => updateSection(pi, si, { instruction: e.target.value })}
                      rows={2}
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Đoạn văn / ngữ liệu (không bắt buộc)</label>
                    <textarea
                      value={section.passage ?? ""}
                      onChange={(e) => updateSection(pi, si, { passage: e.target.value })}
                      rows={2}
                      className={textareaClass}
                    />
                  </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_160px]">
                  <div>
                    <label className={labelClass}>Audio (Listening)</label>
                    <AudioUpload
                      value={section.audio_url}
                      onChange={(url) => updateSection(pi, si, { audio_url: url })}
                    />
                  </div>
                  <FormField htmlFor={`plays-${section._cid}`} label="Số lần nghe tối đa" hint="Để trống = không giới hạn.">
                    <Input
                      id={`plays-${section._cid}`}
                      type="number"
                      min={1}
                      value={section.max_plays ?? ""}
                      onChange={(e) =>
                        updateSection(pi, si, { max_plays: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </FormField>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {section.questions.map((q, qi) => (
                    <QuestionEditor
                      key={q._cid}
                      index={qi}
                      question={q}
                      onChange={(next) => updateQuestion(pi, si, qi, next)}
                      onRemove={() => removeQuestion(pi, si, qi)}
                    />
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Plus className="size-3.5" />}
                    onClick={() => addQuestion(pi, si, "multiple_choice")}
                  >
                    Thêm câu trắc nghiệm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Plus className="size-3.5" />}
                    onClick={() => addQuestion(pi, si, "writing")}
                  >
                    Thêm câu viết luận
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Plus className="size-3.5" />}
                    onClick={() => addQuestion(pi, si, "speaking")}
                  >
                    Thêm câu nói
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="ghost" size="sm" iconLeft={<Plus className="size-3.5" />} onClick={() => addSection(pi)} className="self-start">
              Thêm section
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" iconLeft={<Plus className="size-4" />} onClick={addPart} className="self-start">
        Thêm phần (Part)
      </Button>
    </div>
  );
}

function MoveButtons({ onUp, onDown }: { onUp: () => void; onDown: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        onClick={onUp}
        aria-label="Di chuyển lên"
        className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        onClick={onDown}
        aria-label="Di chuyển xuống"
        className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}
