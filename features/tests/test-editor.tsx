"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ApiError } from "@/lib/api";
import { saveTestStructure, updateTest } from "@/lib/api/tests";
import type { Test, TestDetail, TestPart, TestSection, QuestionType } from "@/lib/types/test";
import { QUESTION_TYPE_LABEL, SKILL_LABEL } from "@/lib/types/test";
import { Switch } from "@/components/ui/switch";
import { AudioUpload } from "@/components/ui/audio-upload";
import { newDraftQuestion, type DraftQuestion } from "@/features/tests/question-editor";
import { SortableQuestion } from "@/features/tests/sortable-question";
import { Sortable } from "@/features/tests/sortable";
import { PreflightModal } from "@/features/tests/preflight-modal";
import { SKILL_CHIP } from "@/features/tests/skill";
import { cn } from "@/lib/utils";

type DraftSection = { _cid: string; id?: number; instruction: string | null; passage: string | null; audio_url: string | null; max_plays: number | null; questions: DraftQuestion[] };
type DraftPart = { _cid: string; id?: number; title: string; sections: DraftSection[] };

function fromServer(parts: TestPart[]): DraftPart[] {
  return parts.map((p) => ({
    _cid: `p-${p.id}`, id: p.id, title: p.title,
    sections: p.sections.map((s: TestSection) => ({
      _cid: `s-${s.id}`, id: s.id, instruction: s.instruction, passage: s.passage, audio_url: s.audio_url, max_plays: s.max_plays,
      questions: s.questions.map((q) => ({
        _cid: `q-${q.id}`, id: q.id, type: q.type, content: q.content, explanation: q.explanation ?? "", images: q.images ?? [],
        record_limit_seconds: q.record_limit_seconds ?? null,
        options: q.options.map((o) => ({ _cid: `o-${o.id}`, id: o.id, label: o.label, content: o.content, is_correct: o.is_correct })),
      })),
    })),
  }));
}
const newSection = (): DraftSection => ({ _cid: crypto.randomUUID(), instruction: "", passage: "", audio_url: null, max_plays: null, questions: [] });
const newPart = (n: number): DraftPart => ({ _cid: crypto.randomUUID(), title: `Phần ${n + 1}`, sections: [newSection()] });
function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir; if (j < 0 || j >= arr.length) return arr;
  const n = [...arr]; [n[i], n[j]] = [n[j], n[i]]; return n;
}

export function TestEditor({ id, initial }: { id: number; initial: TestDetail }) {
  const [title, setTitle] = useState(initial.title);
  const [duration, setDuration] = useState(initial.duration_minutes);
  const [published, setPublished] = useState(!!initial.is_published);
  const [shuffle, setShuffle] = useState(!!initial.shuffle_questions);
  const [parts, setParts] = useState<DraftPart[]>(() => fromServer(initial.parts));
  const [sel, setSel] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [preview, setPreview] = useState(false);
  const skipAutosave = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWriting = initial.skill === "writing";
  const locked = (initial.attempts_count ?? 0) > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const totalQuestions = parts.reduce((n, p) => n + p.sections.reduce((m, s) => m + s.questions.length, 0), 0);
  const perQ = totalQuestions > 0 ? 10 / totalQuestions : 0;
  const part = parts[Math.min(sel, parts.length - 1)];

  const save = useCallback(async (silent = true) => {
    setSaveState("saving");
    try {
      await updateTest(id, { title, duration_minutes: duration, is_published: published, shuffle_questions: shuffle });
      const payload = parts.map((pt, pi) => ({
        id: pt.id, order: pi, title: pt.title,
        sections: pt.sections.map((s, si) => ({
          id: s.id, order: si, instruction: s.instruction || null, passage: s.passage || null, audio_url: s.audio_url || null, max_plays: s.max_plays ?? null,
          questions: s.questions.map((q, qi) => ({
            id: q.id, order: qi, type: q.type, content: q.content || null, explanation: q.explanation || null,
            images: q.type === "speaking" ? q.images : [], record_limit_seconds: q.type === "speaking" ? q.record_limit_seconds : null, score: 1,
            options: ["multiple_choice", "select", "fill_blank"].includes(q.type) ? q.options.filter((o) => o.content.trim() !== "" || o.id).map((o) => ({ id: o.id, label: o.label, content: o.content, is_correct: o.is_correct })) : [],
          })),
        })),
      }));
      const res = await saveTestStructure(id, payload);
      skipAutosave.current = true;
      setParts(fromServer(res.test.parts));
      setSaveState("saved");
      if (!silent) toast.success("Đã lưu đề.");
    } catch (err) {
      setSaveState("dirty");
      toast.error(err instanceof ApiError ? (err.message || "Không lưu được — kiểm tra câu hỏi/đáp án.") : "Không lưu được đề.");
    }
  }, [id, title, duration, published, shuffle, parts]);

  useEffect(() => {
    if (skipAutosave.current) { skipAutosave.current = false; return; }
    if (locked) return;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(true), 5000);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, duration, published, shuffle, parts]);

  // ── mutators ──
  const patchSection = (pi: number, si: number, patch: Partial<DraftSection>) =>
    setParts((p) => p.map((pt, i) => i !== pi ? pt : { ...pt, sections: pt.sections.map((s, j) => j === si ? { ...s, ...patch } : s) }));
  const patchQuestion = (pi: number, si: number, qi: number, q: DraftQuestion) =>
    setParts((p) => p.map((pt, i) => i !== pi ? pt : { ...pt, sections: pt.sections.map((s, j) => j !== si ? s : { ...s, questions: s.questions.map((x, k) => k === qi ? q : x) }) }));
  const addQuestion = (pi: number, si: number, type: QuestionType) =>
    setParts((p) => p.map((pt, i) => i !== pi ? pt : { ...pt, sections: pt.sections.map((s, j) => j !== si ? s : { ...s, questions: [...s.questions, newDraftQuestion(type)] }) }));
  const removeQuestion = (pi: number, si: number, qi: number) =>
    setParts((p) => p.map((pt, i) => i !== pi ? pt : { ...pt, sections: pt.sections.map((s, j) => j !== si ? s : { ...s, questions: s.questions.filter((_, k) => k !== qi) }) }));
  const dupQuestion = (pi: number, si: number, qi: number) =>
    setParts((p) => p.map((pt, i) => i !== pi ? pt : { ...pt, sections: pt.sections.map((s, j) => j !== si ? s : { ...s, questions: s.questions.flatMap((q, k) => k !== qi ? [q] : [q, { ...q, _cid: crypto.randomUUID(), id: undefined, options: q.options.map((o) => ({ ...o, _cid: crypto.randomUUID(), id: undefined })) }]) }) }));
  const reorderQ = (pi: number, si: number, from: number, to: number) =>
    setParts((p) => p.map((pt, i) => i !== pi ? pt : { ...pt, sections: pt.sections.map((s, j) => j === si ? { ...s, questions: arrayMove(s.questions, from, to) } : s) }));
  const addPart = () => setParts((p) => { setSel(p.length); return [...p, newPart(p.length)]; });
  const removePart = (pi: number) => setParts((p) => p.filter((_, i) => i !== pi));
  const movePart = (pi: number, dir: -1 | 1) => setParts((p) => move(p, pi, dir));
  const reorderParts = (from: number, to: number) => {
    setParts((p) => arrayMove(p, from, to));
    setSel((s) => (s === from ? to : s === to ? from : s));
  };
  const addSection = (pi: number) => setParts((p) => p.map((pt, i) => i === pi ? { ...pt, sections: [...pt.sections, newSection()] } : pt));
  const reorderSections = (pi: number, from: number, to: number) =>
    setParts((p) => p.map((pt, i) => i === pi ? { ...pt, sections: arrayMove(pt.sections, from, to) } : pt));

  const previewTest: Test = {
    id, title, slug: "", category_id: initial.category_id ?? null, attempts_count: initial.attempts_count,
    skill: initial.skill, is_combo: !!initial.is_combo, thumbnail_url: initial.thumbnail_url ?? null,
    duration_minutes: duration, total_score: 10, scoring_method: "scale_10_even", shuffle_questions: shuffle,
    word_limit: initial.word_limit, rubric: initial.rubric ?? null, is_published: published, question_count: totalQuestions, created_at: null,
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/teacher/tests" aria-label="Về danh sách đề" className="flex size-10 items-center justify-center rounded-2xl border-[1.5px] border-border bg-surface text-text-secondary hover:text-brand"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Tên đề"
            className="w-full max-w-xl truncate border-0 bg-transparent font-display text-xl font-bold text-text outline-none focus:border-b-[1.5px] focus:border-brand" />
          <p className="text-xs text-text-muted" aria-live="polite">
            {saveState === "saving" ? "Đang lưu…" : saveState === "saved" ? "Đã lưu" : "Chưa lưu"} · thang 10 chia đều — {perQ.toFixed(1)}đ/câu
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreview(true)} className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:border-brand hover:text-brand"><Eye className="size-4" /> Xem trước</button>
          <button onClick={() => save(false)} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)]">Lưu &amp; giao bài</button>
        </div>
      </div>

      {locked && <div className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-text-secondary">⚠ Đề đã có <b className="text-text">{initial.attempts_count} bài làm</b> — sửa không đổi bài đã nộp, không xoá được câu.</div>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* ── Cột trái: cây cấu trúc + cấu hình ── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border-[1.5px] border-border bg-surface p-3">
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">Cấu trúc đề</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => {
              const { active, over } = e; if (!over || active.id === over.id) return;
              const from = parts.findIndex((p) => p._cid === active.id);
              const to = parts.findIndex((p) => p._cid === over.id);
              if (from >= 0 && to >= 0) reorderParts(from, to);
            }}>
              <SortableContext items={parts.map((p) => p._cid)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {parts.map((pt, pi) => {
                    const qCount = pt.sections.reduce((m, s) => m + s.questions.length, 0);
                    const hasAudio = pt.sections.some((s) => s.audio_url);
                    const active = pi === sel;
                    return (
                      <Sortable key={pt._cid} id={pt._cid} disabled={locked}>
                        {({ attributes, listeners }) => (
                          <div>
                            <div className={cn("flex items-center gap-1 rounded-xl transition-colors", active ? "bg-brand-soft" : "hover:bg-surface-alt")}>
                              {!locked && (
                                <button {...attributes} {...listeners} aria-label={`Kéo để đổi thứ tự ${pt.title}`}
                                  className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-text-muted hover:text-text active:cursor-grabbing"><GripVertical className="size-4" /></button>
                              )}
                              <button onClick={() => setSel(pi)} className="min-w-0 flex-1 py-2 pr-2 text-left">
                                <span className={cn("block truncate text-sm font-bold", active ? "text-brand" : "text-text")}>{pt.title}</span>
                                <span className="block text-xs text-text-muted">{pt.sections.length} section{hasAudio ? " · audio" : ""} · {qCount} câu</span>
                              </button>
                            </div>
                            {active && qCount > 0 && (
                              <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-2">
                                {pt.sections.flatMap((s) => s.questions).map((q, k) => (
                                  <span key={q._cid} className="rounded-lg px-2 py-1 text-xs text-text-secondary">Câu {k + 1} · {QUESTION_TYPE_LABEL[q.type]}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Sortable>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
            <button onClick={addPart} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong px-3 py-2 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand"><Plus className="size-3.5" /> Thêm Part</button>

            <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3 text-sm">
              <label className="flex items-center justify-between gap-2"><span className="text-text-secondary">Tổng thời gian</span>
                <span className="flex items-center gap-1"><input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 1)} className="h-8 w-16 rounded-lg border-[1.5px] border-border bg-surface px-2 text-right text-sm outline-none focus-visible:border-brand" /><span className="text-text-muted">phút</span></span>
              </label>
              <div className="flex items-center justify-between"><span className="text-text-secondary">Tổng điểm</span><span className="font-semibold text-text">10.0</span></div>
              <label className="flex items-center justify-between"><span className="text-text-secondary">Trộn câu hỏi</span><Switch checked={shuffle} onCheckedChange={setShuffle} aria-label="Trộn câu hỏi" /></label>
              <label className="flex items-center justify-between">
                <span className="text-text-secondary">Hiện trong thư viện</span>
                <Switch checked={isWriting ? false : published} onCheckedChange={isWriting ? () => {} : setPublished} disabled={isWriting} aria-label="Hiện trong thư viện" />
              </label>
              {isWriting && <p className="text-[11px] text-text-muted">Đề Writing do cô chấm tay — không hiện tự do trong thư viện.</p>}
            </div>
          </div>
        </aside>

        {/* ── Cột phải: Part đang chọn ── */}
        <div className="min-w-0">
          {!part ? (
            <div className="rounded-2xl border-[1.5px] border-dashed border-border bg-surface p-10 text-center text-text-muted">Chưa có phần nào — bấm “Thêm Part”.</div>
          ) : (
            <div className="rounded-2xl border-[1.5px] border-border bg-surface p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold uppercase", SKILL_CHIP[initial.skill])}>{SKILL_LABEL[initial.skill]}</span>
                <input value={part.title} onChange={(e) => setParts((p) => p.map((x, i) => i === sel ? { ...x, title: e.target.value } : x))}
                  className="min-w-0 flex-1 border-0 bg-transparent font-display text-lg font-bold text-text outline-none focus:border-b-[1.5px] focus:border-brand" />
                <div className="flex items-center gap-1">
                  <button onClick={() => movePart(sel, -1)} disabled={sel === 0} aria-label="Đưa Part lên" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt disabled:opacity-30"><ChevronUp className="size-4" /></button>
                  <button onClick={() => movePart(sel, 1)} disabled={sel >= parts.length - 1} aria-label="Đưa Part xuống" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt disabled:opacity-30"><ChevronDown className="size-4" /></button>
                  {!locked && <button onClick={() => { removePart(sel); setSel(Math.max(0, sel - 1)); }} aria-label="Xoá Part" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-4" /></button>}
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => {
                const { active, over } = e; if (!over || active.id === over.id) return;
                const from = part.sections.findIndex((s) => s._cid === active.id);
                const to = part.sections.findIndex((s) => s._cid === over.id);
                if (from >= 0 && to >= 0) reorderSections(sel, from, to);
              }}>
              <SortableContext items={part.sections.map((s) => s._cid)} strategy={verticalListSortingStrategy}>
              {part.sections.map((section, si) => (
                <Sortable key={section._cid} id={section._cid} disabled={locked} className="mb-4 rounded-2xl border border-border p-3">
                  {({ attributes, listeners }) => (
                  <>
                  <div className="mb-2 flex items-center gap-2">
                    {!locked && part.sections.length > 1 && (
                      <button {...attributes} {...listeners} aria-label={`Kéo để đổi thứ tự Section ${si + 1}`}
                        className="flex size-6 cursor-grab touch-none items-center justify-center rounded-md text-text-muted hover:text-text active:cursor-grabbing"><GripVertical className="size-4" /></button>
                    )}
                    <span className="text-xs font-bold uppercase text-text-muted">Section {si + 1}</span>
                    {!locked && part.sections.length > 1 && (
                      <button onClick={() => setParts((p) => p.map((pt, i) => i === sel ? { ...pt, sections: pt.sections.filter((_, j) => j !== si) } : pt))}
                        aria-label="Xoá section" className="ml-auto flex size-7 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-3.5" /></button>
                    )}
                  </div>
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <textarea value={section.instruction ?? ""} onChange={(e) => patchSection(sel, si, { instruction: e.target.value })} rows={2} placeholder="Hướng dẫn phần" className="w-full rounded-xl border-[1.5px] border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-brand" />
                    <textarea value={section.passage ?? ""} onChange={(e) => patchSection(sel, si, { passage: e.target.value })} rows={2} placeholder="Đoạn văn / ngữ liệu (không bắt buộc)" className="w-full rounded-xl border-[1.5px] border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-brand" />
                  </div>

                  {initial.skill === "listening" && (
                    <div className="mb-3 rounded-2xl bg-surface-alt/60 p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase text-text-muted">File nghe của section</p>
                      <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                        <AudioUpload value={section.audio_url} onChange={(url) => patchSection(sel, si, { audio_url: url })} />
                        <label className="flex items-center gap-2 text-sm"><span className="text-text-secondary">Số lần nghe</span>
                          <select value={section.max_plays ?? ""} onChange={(e) => patchSection(sel, si, { max_plays: e.target.value === "" ? null : Number(e.target.value) })} className="h-9 flex-1 rounded-lg border-[1.5px] border-border bg-surface px-2 text-sm outline-none focus-visible:border-brand">
                            <option value="">∞</option>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => {
                    const { active, over } = e; if (!over || active.id === over.id) return;
                    const from = section.questions.findIndex((q) => q._cid === active.id);
                    const to = section.questions.findIndex((q) => q._cid === over.id);
                    if (from >= 0 && to >= 0) reorderQ(sel, si, from, to);
                  }}>
                    <SortableContext items={section.questions.map((q) => q._cid)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-2">
                        {section.questions.map((q, qi) => (
                          <SortableQuestion key={q._cid} id={q._cid} index={qi} scorePerQuestion={perQ} question={q} disabled={locked}
                            onChange={(next) => patchQuestion(sel, si, qi, next)} onRemove={() => removeQuestion(sel, si, qi)} onDuplicate={() => dupQuestion(sel, si, qi)} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {!locked && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["multiple_choice", "fill_blank", "select", "writing"] as QuestionType[]).map((t) => (
                        <button key={t} onClick={() => addQuestion(sel, si, t)} className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand"><Plus className="size-3.5" /> {QUESTION_TYPE_LABEL[t]}</button>
                      ))}
                    </div>
                  )}
                  </>
                  )}
                </Sortable>
              ))}
              </SortableContext>
              </DndContext>

              {!locked && <button onClick={() => addSection(sel)} className="w-full rounded-xl border border-dashed border-border-strong py-2.5 text-sm font-semibold text-text-secondary hover:border-brand hover:text-brand">+ Thêm section vào {part.title}</button>}
            </div>
          )}
        </div>
      </div>

      <PreflightModal test={previewTest} open={preview} onClose={() => setPreview(false)} onEdit={() => setPreview(false)} onAssign={() => { setPreview(false); toast.message("Giao bài mở ở màn Lớp học › Giao bài."); }} />
    </div>
  );
}
