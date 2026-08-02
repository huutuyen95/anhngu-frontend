"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { createTest, updateTest, type TestPayload } from "@/lib/api/tests";
import type { Skill, Test, TestDetail } from "@/lib/types/test";
import { SKILL_LABEL } from "@/lib/types/test";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

const textareaClass =
  "w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";

type Props =
  | { mode: "create"; initial?: undefined; onSaved: (test: Test) => void }
  | { mode: "edit"; initial: TestDetail; onSaved: (test: Test) => void };

export function TestForm({ mode, initial, onSaved }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [skill, setSkill] = useState<Skill>(initial?.skill ?? "reading");
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60);
  const [totalScore, setTotalScore] = useState(initial?.total_score ?? 10);
  const [wordLimit, setWordLimit] = useState<number | "">(initial?.word_limit ?? "");
  const [rubric, setRubric] = useState(initial?.rubric ?? "");
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title);
    setSkill(initial.skill);
    setDuration(initial.duration_minutes);
    setTotalScore(initial.total_score);
    setWordLimit(initial.word_limit ?? "");
    setRubric(initial.rubric ?? "");
    setIsPublished(initial.is_published);
  }, [initial]);

  const isWriting = skill === "writing";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    const payload: TestPayload = {
      title,
      skill,
      duration_minutes: Number(duration),
      total_score: Number(totalScore),
      word_limit: isWriting && wordLimit !== "" ? Number(wordLimit) : null,
      rubric: isWriting ? rubric || null : null,
      is_published: isPublished,
    };
    try {
      const { test } = mode === "edit" ? await updateTest(initial.id, payload) : await createTest(payload);
      onSaved(test);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
        setErrors(mapped);
      } else if (err instanceof ApiError) {
        setErrors({ _: err.message });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {errors._ && <div className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">{errors._}</div>}

      <FormField htmlFor="t-title" label="Tên đề" required error={errors.title}>
        <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField htmlFor="t-skill" label="Kỹ năng / dạng đề" required error={errors.skill}>
          <select
            id="t-skill"
            value={skill}
            onChange={(e) => setSkill(e.target.value as Skill)}
            className="h-11 w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            {Object.entries(SKILL_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField htmlFor="t-duration" label="Thời gian làm bài (phút)" required error={errors.duration_minutes}>
          <Input
            id="t-duration"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            required
          />
        </FormField>
      </div>

      <FormField htmlFor="t-score" label="Thang điểm" required error={errors.total_score} hint="Tổng điểm tối đa của đề.">
        <Input
          id="t-score"
          type="number"
          min={0}
          step="0.5"
          value={totalScore}
          onChange={(e) => setTotalScore(Number(e.target.value))}
          required
        />
      </FormField>

      {isWriting && (
        <>
          <FormField
            htmlFor="t-word-limit"
            label="Giới hạn số từ"
            error={errors.word_limit}
            hint="Để trống nếu không giới hạn."
          >
            <Input
              id="t-word-limit"
              type="number"
              min={1}
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </FormField>

          <FormField htmlFor="t-rubric" label="Hướng dẫn chấm (rubric)" error={errors.rubric}>
            <textarea
              id="t-rubric"
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </FormField>
        </>
      )}

      <div className="flex items-center justify-between rounded-xl border-[1.5px] border-border bg-surface-alt px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-text">Đăng đề</p>
          <p className="text-xs text-text-muted">
            {isPublished ? "Học sinh có thể thấy và làm đề này." : "Đang ở dạng nháp, chỉ giáo viên thấy."}
          </p>
        </div>
        <Switch checked={isPublished} onCheckedChange={setIsPublished} aria-label="Đăng đề" />
      </div>

      <Button type="submit" loading={saving} className="self-start">
        {mode === "edit" ? "Lưu thông tin" : "Tạo đề & thêm câu hỏi"}
      </Button>
    </form>
  );
}
