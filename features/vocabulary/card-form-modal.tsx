"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Wand2, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createCard,
  deleteCardAudio,
  ipaLookup,
  updateCard,
  uploadCardAudio,
  uploadCardImage,
} from "@/lib/api/decks";
import type { Card, Deck } from "@/lib/types/deck";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PronounceButton } from "@/components/ui/pronounce-button";
import { cn } from "@/lib/utils";
import { ExampleText } from "@/features/vocabulary/example-text";

const POS = ["n.", "v.", "adj.", "adv.", "phr."];
const IPA_KEYS = ["ˈ", "ˌ", "ː", "ə", "æ", "ɪ", "ʊ", "ɔ", "ʌ", "θ", "ð", "ʃ", "ʒ", "ŋ", "dʒ"];

export function CardFormModal({
  open,
  onClose,
  deck,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  deck: Deck;
  editing: Card | null;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [term, setTerm] = useState("");
  const [pos, setPos] = useState("");
  const [meaning, setMeaning] = useState("");
  const [ipa, setIpa] = useState("");
  const [example, setExample] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<"auto" | "file">("auto");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const ipaRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const audRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingAudio, setPendingAudio] = useState<File | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setTerm(editing?.term ?? "");
    setPos(editing?.pos ?? "");
    setMeaning(editing?.meaning ?? "");
    setIpa(editing?.ipa ?? "");
    setExample(editing?.example ?? "");
    setImageUrl(editing?.image_url ?? null);
    setAudioUrl(editing?.audio_url ?? null);
    setAudioMode(editing?.audio_url ? "file" : "auto");
    setPendingImage(null);
    setPendingAudio(null);
  }, [open, editing]);

  useEffect(() => {
    if (!pendingImage) {
      setPreviewImg(imageUrl);
      return;
    }
    const url = URL.createObjectURL(pendingImage);
    setPreviewImg(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingImage, imageUrl]);

  async function autoIpa() {
    if (!term.trim()) return;
    const { results } = await ipaLookup([term.trim()]);
    const found = results[term.trim().toLowerCase()];
    if (found?.ipa) {
      setIpa(found.ipa);
      if (!pos && found.pos) setPos(found.pos);
    } else {
      toast("Chưa có trong từ điển, cô nhập tay nhé.");
    }
  }

  function insertIpa(sym: string) {
    const el = ipaRef.current;
    if (!el) { setIpa((v) => v + sym); return; }
    const start = el.selectionStart ?? ipa.length;
    const end = el.selectionEnd ?? ipa.length;
    const next = ipa.slice(0, start) + sym + ipa.slice(end);
    setIpa(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + sym.length, start + sym.length); });
  }

  async function save(again: boolean) {
    setErrors({});
    setSaving(true);
    try {
      const payload = { term, pos: pos || null, meaning, ipa: ipa || null, example: example || null };
      let cardId: number;
      if (isEdit && editing) {
        await updateCard(editing.id, payload);
        cardId = editing.id;
      } else {
        const { card } = await createCard(deck.id, payload);
        cardId = card.id;
      }
      if (pendingImage) await uploadCardImage(cardId, pendingImage).catch(() => toast.error("Không tải được ảnh."));
      if (audioMode === "file" && pendingAudio) await uploadCardAudio(cardId, pendingAudio).catch(() => toast.error("Không tải được audio."));
      if (audioMode === "auto" && isEdit && editing?.audio_url) await deleteCardAudio(cardId).catch(() => {});

      onSaved();
      if (again && !isEdit) {
        setTerm(""); setMeaning(""); setIpa(""); setExample(""); setImageUrl(null); setAudioUrl(null); setPendingImage(null); setPendingAudio(null); setAudioMode("auto");
        setTimeout(() => document.getElementById("c-term")?.focus(), 30);
      } else {
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const m: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) m[k] = v[0];
        setErrors(m);
      } else toast.error("Không lưu được thẻ.");
    } finally {
      setSaving(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void save(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Sửa nội dung card từ vựng" : "Thêm card từ vựng"}
      description="Những nội dung dưới đây sẽ hiển thị trực tiếp trên card của học sinh."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          {!isEdit && <Button variant="ghost" onClick={() => void save(true)} loading={saving}>Lưu & thêm thẻ mới</Button>}
          <Button type="submit" form="card-form" loading={saving}>Lưu thẻ</Button>
        </>
      }
    >
      <form id="card-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2" noValidate>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <FormField htmlFor="c-term" label="Từ / cụm từ tiếng Anh" required error={errors.term} className="flex-1">
              <Input id="c-term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ví dụ: make a decision" required />
            </FormField>
            <label className="flex w-24 flex-col gap-1.5 text-sm">
              <span className="font-semibold text-text">Từ loại</span>
              <Select value={pos} onChange={(e) => setPos(e.target.value)}>
                <option value="">—</option>
                {POS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </label>
          </div>

          <FormField htmlFor="c-meaning" label="Nghĩa / định nghĩa tiếng Việt" required error={errors.meaning}>
            <Input id="c-meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Ví dụ: đưa ra quyết định" required />
          </FormField>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text">Phiên âm IPA</span>
              <button type="button" onClick={autoIpa} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                <Wand2 className="size-3.5" /> Tự tra phiên âm
              </button>
            </div>
            <div className="flex gap-2">
              <Input ref={ipaRef} value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder="/ˈsuː.vənɪər/" className="flex-1" />
              <PronounceButton term={term} voiceKey={deck.tts_voice} rate={deck.tts_rate} size="sm" />
            </div>
            <div className="flex flex-wrap gap-1">
              {IPA_KEYS.map((s) => (
                <button key={s} type="button" onClick={() => insertIpa(s)} className="rounded-md border border-border bg-surface-alt px-1.5 py-0.5 text-xs text-text hover:border-brand">{s}</button>
              ))}
            </div>
          </div>

          <FormField htmlFor="c-example" label="Câu mẫu" hint="Hiển thị ở mặt sau card. Bọc *từ khoá* để in đậm; nút nghe vẫn chỉ đọc từ/cụm từ.">
            <textarea id="c-example" value={example} onChange={(e) => setExample(e.target.value)} rows={3} placeholder="Ví dụ: I need to *make a decision* today." className="w-full rounded-[14px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30" />
          </FormField>
          {example.trim() ? (
            <div className="rounded-xl border border-border bg-surface-alt p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Xem trước câu mẫu</p>
              <p className="text-sm leading-relaxed text-text-secondary">“<ExampleText text={example} />”</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text">Ảnh minh hoạ (tuỳ chọn)</span>
            <input ref={imgRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && setPendingImage(e.target.files[0])} />
            <button type="button" onClick={() => imgRef.current?.click()} className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-dashed border-border-strong hover:border-brand">
              {previewImg ? <img src={previewImg} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-text-muted"><ImagePlus className="size-6" /><span className="text-xs">Tải ảnh ≤ 2MB</span></span>}
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border-[1.5px] border-border bg-surface-alt p-3">
            <span className="text-sm font-semibold text-text">Audio phát âm</span>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="radio" checked={audioMode === "auto"} onChange={() => setAudioMode("auto")} /> Đọc tự động từ phiên âm
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="radio" checked={audioMode === "file"} onChange={() => setAudioMode("file")} /> Tải file mp3 của cô <span className="text-xs text-text-muted">(ưu tiên phát file này)</span>
            </label>
            {audioMode === "file" && (
              <>
                <input ref={audRef} type="file" accept=".mp3,.wav,.m4a" className="hidden" onChange={(e) => e.target.files?.[0] && setPendingAudio(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" iconLeft={<Upload className="size-4" />} onClick={() => audRef.current?.click()}>
                  {pendingAudio ? pendingAudio.name : audioUrl ? "Đổi file mp3" : "Chọn file mp3"}
                </Button>
              </>
            )}
            <p className={cn("text-xs", "text-text-muted")}>Nghe thử với giọng {deck.tts_voice} · {deck.tts_rate}×</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
