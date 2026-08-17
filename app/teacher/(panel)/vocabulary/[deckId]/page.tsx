"use client";

import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Upload,
  Eye,
  Search,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageOff,
  MessageSquareQuote,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteCard,
  getDeck,
  listCards,
  reorderCards,
  updateDeck,
} from "@/lib/api/decks";
import { TTS_RATES, VOICE_OPTIONS, type Card, type Deck } from "@/lib/types/deck";
import type { VoiceKey } from "@/lib/tts";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PronounceButton } from "@/components/ui/pronounce-button";
import { CardFormModal } from "@/features/vocabulary/card-form-modal";
import { CardImportWizard } from "@/features/vocabulary/card-import-wizard";
import { DeckPreviewModal } from "@/features/vocabulary/deck-preview-modal";
import { ExampleText } from "@/features/vocabulary/example-text";

function DeckDetail({ deckId }: { deckId: number }) {
  const params = useSearchParams();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [missing, setMissing] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(params.get("preview") === "1");
  const [confirmDel, setConfirmDel] = useState<Card | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDeck = useCallback(() => {
    getDeck(deckId).then((r) => setDeck(r.deck)).catch(() => setDeck(null));
  }, [deckId]);

  const loadCards = useCallback(() => {
    return listCards(deckId, { q, missing }).then((r) => setCards(r.data)).catch(() => setCards([]));
  }, [deckId, q, missing]);

  useEffect(() => { loadDeck(); }, [loadDeck]);
  useEffect(() => { loadCards().finally(() => setLoading(false)); }, [loadCards]);

  function onSearchChange(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setQ(v), 350);
  }

  async function saveTts(patch: { tts_voice?: VoiceKey; tts_rate?: number }) {
    if (!deck) return;
    setDeck({ ...deck, ...patch });
    await updateDeck(deck.id, patch).then(() => toast.success("Đã lưu giọng đọc")).catch(() => toast.error("Không lưu được."));
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[i], next[j]] = [next[j], next[i]];
    setCards(next);
    await reorderCards(deckId, next.map((c) => c.id)).catch(() => toast.error("Không lưu được thứ tự."));
  }

  async function doDelete(card: Card) {
    await deleteCard(card.id);
    setConfirmDel(null);
    toast.success("Đã xoá thẻ.");
    loadCards();
    loadDeck();
  }

  if (!deck) {
    return <div className="mx-auto max-w-6xl"><div className="h-8 w-48 animate-pulse rounded-lg bg-surface-alt" /></div>;
  }

  const audioLabel = (c: Card) => (c.audio_url ? "File mp3" : c.ipa ? "Tự động" : "Thiếu IPA");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/teacher/vocabulary" aria-label="Về danh sách bộ từ" className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-border bg-surface text-text-secondary hover:border-brand hover:text-brand">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-text">{deck.name}</h1>
            <StatusBadge tone={deck.is_published ? "success" : "neutral"}>{deck.is_published ? "Trong thư viện" : "Đang ẩn"}</StatusBadge>
          </div>
          <p className="text-sm text-text-muted">{deck.cards_count ?? cards.length} thẻ · {deck.audio_ready_count ?? 0} có audio</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" iconLeft={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>Import Excel</Button>
          <Button variant="outline" size="sm" iconLeft={<Eye className="size-4" />} onClick={() => setPreviewOpen(true)}>Xem như học sinh</Button>
          <Button size="sm" iconLeft={<Plus className="size-4" />} onClick={() => { setEditing(null); setCardOpen(true); }}>Thêm thẻ</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Tìm từ, nghĩa hoặc câu mẫu…" className="h-10 pl-9" />
        </div>
        {[["", "Tất cả"], ["audio", "⚠ Thiếu audio"], ["image", "Thiếu ảnh"], ["ipa", "Thiếu IPA"], ["example", "Thiếu câu mẫu"]].map(([k, l]) => (
          <button key={k} onClick={() => setMissing(k)} className={"rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " + (missing === k ? "bg-brand text-white" : "bg-surface-alt text-text-secondary hover:bg-brand-soft")}>{l}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Select value={deck.tts_voice} onChange={(e) => saveTts({ tts_voice: e.target.value as VoiceKey })} aria-label="Giọng đọc">
            {VOICE_OPTIONS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </Select>
          <Select value={deck.tts_rate} onChange={(e) => saveTts({ tts_rate: Number(e.target.value) })} aria-label="Tốc độ">
            {TTS_RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
        {loading ? (
          <div className="p-6 text-center text-sm text-text-muted">Đang tải…</div>
        ) : cards.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Plus className="size-7" />} title={q || missing ? "Không có thẻ phù hợp" : "Chưa có thẻ nào"} description="Thêm thẻ thủ công hoặc import từ Excel." action={<Button size="sm" onClick={() => { setEditing(null); setCardOpen(true); }}>Thêm thẻ</Button>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-text-secondary">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">#</th>
                  <th className="px-3 py-3 text-left font-semibold">Nội dung học sinh nhìn thấy</th>
                  <th className="px-3 py-3 text-left font-semibold">Ảnh & phát âm</th>
                  <th className="px-3 py-3 text-right font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c, i) => (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-alt">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-text-muted">
                        <span className="w-5 text-center">{i + 1}</span>
                        <div className="flex flex-col">
                          <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Lên" className="text-text-muted hover:text-brand disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
                          <button onClick={() => move(i, 1)} disabled={i === cards.length - 1} aria-label="Xuống" className="text-text-muted hover:text-brand disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
                        </div>
                      </div>
                    </td>
                    <td className="min-w-[320px] px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-display text-base font-bold text-text">{c.term}</span>
                          {c.pos ? <StatusBadge tone="info">{c.pos}</StatusBadge> : <span className="text-xs text-warning">Chưa có từ loại</span>}
                          <span className="font-mono text-xs text-text-muted">{c.ipa ?? "Chưa có IPA"}</span>
                        </div>
                        <p className="text-sm text-text-secondary"><span className="font-semibold text-text">Nghĩa:</span> {c.meaning}</p>
                        {c.example ? (
                          <p className="flex items-start gap-1.5 text-sm leading-relaxed text-text-muted">
                            <MessageSquareQuote className="mt-0.5 size-4 shrink-0" />
                            <span><span className="font-semibold text-text-secondary">Câu mẫu:</span> <ExampleText text={c.example} /></span>
                          </p>
                        ) : (
                          <p className="flex items-center gap-1.5 text-xs font-medium text-warning"><MessageSquareQuote className="size-3.5" /> Chưa có câu mẫu</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-[150px] items-center gap-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="h-12 w-16 rounded-xl object-cover" />
                        ) : (
                          <span className="flex h-12 w-16 items-center justify-center rounded-xl bg-surface-alt text-text-muted"><ImageOff className="size-5" /></span>
                        )}
                        <div>
                          <PronounceButton term={c.term} audioUrl={c.audio_url} voiceKey={deck.tts_voice} rate={deck.tts_rate} size="sm" />
                          <p className={"mt-1 text-xs " + (c.audio_url ? "text-success" : c.ipa ? "text-text-muted" : "text-warning")}>{audioLabel(c)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(c); setCardOpen(true); }} aria-label="Sửa thẻ" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text"><Pencil className="size-4" /></button>
                        <button onClick={() => setConfirmDel(c)} aria-label="Xoá thẻ" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-text-muted">Thứ tự thẻ = thứ tự học sinh gặp khi học. Dùng ↑/↓ để đổi.</p>

      <CardFormModal open={cardOpen} onClose={() => setCardOpen(false)} deck={deck} editing={editing} onSaved={() => { loadCards(); loadDeck(); }} />
      <CardImportWizard open={importOpen} onClose={() => setImportOpen(false)} deckId={deckId} onDone={() => { loadCards(); loadDeck(); }} />
      <DeckPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} deck={deck} cards={cards} />

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) return doDelete(confirmDel); }} title="Xoá thẻ?" danger confirmLabel="Xoá thẻ" description={confirmDel ? `Xoá thẻ "${confirmDel.term}"?` : null} />
    </div>
  );
}

export default function DeckDetailPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}>
      <DeckDetail deckId={Number(deckId)} />
    </Suspense>
  );
}
