"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { createDeck, updateDeck } from "@/lib/api/decks";
import { listClassrooms } from "@/lib/api/classrooms";
import { VOICE_OPTIONS, type Deck } from "@/lib/types/deck";
import type { ClassroomRef } from "@/lib/types/student";
import { speak, type VoiceKey } from "@/lib/tts";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const RATES = [0.7, 0.8, 0.9, 1.0, 1.1];

export function DeckFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Deck | null;
  onSaved: (deck: Deck, isNew: boolean) => void;
}) {
  const isEdit = !!editing;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classIds, setClassIds] = useState<number[]>([]);
  const [voice, setVoice] = useState<VoiceKey>("en-GB-female");
  const [rate, setRate] = useState(0.9);
  const [publish, setPublish] = useState(false);
  const [classrooms, setClassrooms] = useState<ClassroomRef[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setClassIds(editing?.classroom_ids ?? []);
    setVoice(editing?.tts_voice ?? "en-GB-female");
    setRate(editing?.tts_rate ?? 0.9);
    setPublish(editing?.is_published ?? false);
  }, [open, editing]);

  useEffect(() => {
    listClassrooms().then((r) => setClassrooms(r.data)).catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        classroom_ids: classIds,
        tts_voice: voice,
        tts_rate: rate,
        is_published: publish,
      };
      if (isEdit && editing) {
        const { deck } = await updateDeck(editing.id, payload);
        onSaved(deck, false);
      } else {
        const { deck } = await createDeck(payload);
        onSaved(deck, true);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const m: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) m[k] = v[0];
        setErrors(m);
      } else toast.error("Không lưu được bộ từ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa bộ từ" : "Tạo bộ từ"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="deck-form" loading={saving}>
            {isEdit ? "Lưu" : "Tạo bộ & thêm thẻ"}
          </Button>
        </>
      }
    >
      <form id="deck-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormField htmlFor="d-name" label="Tên bộ từ" required error={errors.name}>
          <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: GRADE 6 UNIT 1" required />
        </FormField>

        {classrooms.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text">Gán cho lớp</span>
            <p className="-mt-1 text-xs text-text-muted">Để trống = bộ dùng chung cho mọi lớp.</p>
            <div className="flex flex-wrap gap-3 rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
              {classrooms.map((c) => (
                <Checkbox
                  key={c.id}
                  checked={classIds.includes(c.id)}
                  onCheckedChange={() =>
                    setClassIds((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))
                  }
                  label={c.name}
                />
              ))}
            </div>
          </div>
        )}

        <FormField htmlFor="d-desc" label="Mô tả">
          <textarea
            id="d-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
          />
        </FormField>

        <div className="rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Giọng đọc mặc định của bộ từ</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-text">Giọng</span>
              <select value={voice} onChange={(e) => setVoice(e.target.value as VoiceKey)} className="h-10 rounded-xl border-[1.5px] border-border bg-surface px-2 text-sm outline-none focus-visible:border-brand">
                {VOICE_OPTIONS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-text">Tốc độ</span>
              <select value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-10 rounded-xl border-[1.5px] border-border bg-surface px-2 text-sm outline-none focus-visible:border-brand">
                {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              iconLeft={<Volume2 className="size-4" />}
              onClick={() => speak({ text: "This is a sample voice", voiceKey: voice, rate, repeat: 1 })}
            >
              Nghe thử
            </Button>
          </div>
        </div>

        <Checkbox
          checked={publish}
          onCheckedChange={setPublish}
          label="Hiện trong thư viện ngay (nên bật sau khi đã có thẻ)"
        />
      </form>
    </Modal>
  );
}
