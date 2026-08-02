"use client";

import { useEffect, useState } from "react";
import { BookmarkPlus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveVocab, type DictResult } from "@/lib/api/dictionary";
import { PronounceButton } from "@/components/ui/pronounce-button";
import type { SelectionPopup } from "@/hooks/useSelectionDictionary";

/**
 * Popover tra từ (desktop) / bottom-sheet (mobile) khi bôi đen từ trong tài liệu.
 * Hiện từ + IPA + nút nghe + nghĩa tiếng Việt + "Lưu vào bộ từ".
 */
export function DictionaryPopover({ popup, result, loading, onClose }: {
  popup: SelectionPopup;
  result: DictResult | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(false); }, [popup.word]);

  async function save() {
    if (!result) return;
    try {
      await saveVocab({ word: result.word, meaning: result.meaning_vi, ipa: result.ipa });
      setSaved(true);
      toast.success(`Đã lưu "${result.word}".`);
    } catch { toast.error("Không lưu được từ."); }
  }

  const body = (
    <>
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-text-muted"><Loader2 className="size-4 animate-spin" /> Đang tra…</div>
      ) : !result || !result.found ? (
        <p className="py-2 text-sm text-text-muted">Không tìm thấy “{popup.word}”.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-text">{result.word}</span>
            <PronounceButton term={result.word} voiceKey="en-US-female" rate={1} size="sm" />
          </div>
          {result.ipa && <p className="text-sm text-text-secondary">/{result.ipa}/{result.pos ? ` · ${result.pos}` : ""}</p>}
          {result.matched_from && result.matched_from !== result.word && (
            <p className="text-xs text-text-muted">dạng gốc của “{popup.word}”</p>
          )}
          <p className="mt-1 text-[15px] text-text">{result.meaning_vi ?? "—"}</p>
          <button onClick={save} disabled={saved}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)] disabled:opacity-60 disabled:shadow-none">
            {saved ? <><Check className="size-4" /> Đã lưu</> : <><BookmarkPlus className="size-4" /> Lưu vào bộ từ</>}
          </button>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: popover neo theo vị trí bôi đen */}
      <div data-dict-popover className="pointer-events-auto fixed z-50 hidden w-64 -translate-x-1/2 -translate-y-full rounded-2xl border-[1.5px] border-border bg-surface p-3 shadow-[0_16px_40px_rgba(58,51,48,0.18)] sm:block"
        style={{ left: popup.x, top: popup.y - 8 }}>
        <button onClick={onClose} aria-label="Đóng" className="absolute right-2 top-2 text-text-muted hover:text-text"><X className="size-4" /></button>
        {body}
      </div>

      {/* Mobile: bottom sheet */}
      <div className="fixed inset-0 z-50 flex items-end sm:hidden">
        <div data-dict-popover className="w-full rounded-t-3xl border-t-[1.5px] border-border bg-surface p-5 pb-8 shadow-[0_-16px_40px_rgba(58,51,48,0.18)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
          {body}
        </div>
      </div>
    </>
  );
}
