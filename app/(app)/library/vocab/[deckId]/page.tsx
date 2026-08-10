"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { completeDeckSession, getStudyDeck, saveCardProgress } from "@/lib/api/decks";
import type { Card } from "@/lib/types/deck";
import type { VoiceKey } from "@/lib/tts";
import { speak } from "@/lib/tts";
import { PronounceButton } from "@/components/ui/pronounce-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExampleText } from "@/features/vocabulary/example-text";

type DeckCfg = { id: number; name: string; tts_voice: VoiceKey; tts_rate: number; tts_repeat: string };

function StudyScreen({ deckId }: { deckId: number }) {
  const [cfg, setCfg] = useState<DeckCfg | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [queue, setQueue] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [done, setDone] = useState(false);
  const interacted = useRef(false);
  const startedAt = useRef(0);

  const current = queue[0] ?? null;

  const load = useCallback(() => {
    getStudyDeck(deckId).then((r) => {
      setCfg(r.deck);
      setAllCards(r.cards);
      const learn = r.cards.filter((c) => c.progress_status !== "known");
      setQueue(learn.length ? learn : r.cards);
      setKnownCount(0);
      setDone(false);
      setFlipped(false);
      startedAt.current = Date.now();
    });
  }, [deckId]);

  useEffect(() => { load(); }, [load]);

  // Tự đọc term khi hiện thẻ mới (chỉ khi tts_repeat='auto' và đã có tương tác — iOS).
  useEffect(() => {
    if (cfg?.tts_repeat === "auto" && current && !flipped && interacted.current && !current.audio_url) {
      speak({ text: current.term, voiceKey: cfg.tts_voice, rate: cfg.tts_rate, repeat: 1 });
    }
  }, [current, flipped, cfg]);

  const advance = useCallback((status: "known" | "learning") => {
    if (!current) return;
    interacted.current = true;
    saveCardProgress(current.id, status).catch(() => {});
    setQueue((q) => {
      const [head, ...rest] = q;
      const next = status === "known" ? rest : [...rest, head];
      if (next.length === 0) {
        setDone(true);
        completeDeckSession(deckId, Math.round((Date.now() - startedAt.current) / 1000)).catch(() => {});
      }
      return next;
    });
    if (status === "known") setKnownCount((k) => k + 1);
    setFlipped(false);
  }, [current, deckId]);

  // Bàn phím (desktop).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === " ") { e.preventDefault(); interacted.current = true; setFlipped((f) => !f); }
      if (e.key === "ArrowRight") advance("known");
      if (e.key === "ArrowLeft") advance("learning");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, done]);

  // Vuốt (mobile).
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 60) advance(dx > 0 ? "known" : "learning");
    touchX.current = null;
  }

  if (!cfg) return <div className="mx-auto max-w-md p-4"><div className="h-64 animate-pulse rounded-3xl bg-surface-alt" /></div>;

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
        <PartyPopper className="size-14 text-brand motion-safe:animate-bounce" />
        <h1 className="font-display text-2xl font-bold text-text">Hoàn thành! 🎉</h1>
        <p className="text-text-secondary">Em đã học {knownCount} từ trong bộ “{cfg.name}”.</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button onClick={load} className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)] active:translate-y-0.5 active:shadow-none">Học lại tất cả</button>
          <Link href="/missions" className="rounded-full border-[1.5px] border-border bg-surface px-5 py-3 text-center text-sm font-semibold text-text hover:bg-surface-alt">Về Nhiệm vụ</Link>
        </div>
      </div>
    );
  }

  const progress = allCards.length ? ((allCards.length - queue.length) / allCards.length) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/library/vocab" aria-label="Về danh sách bộ từ" className="flex size-10 items-center justify-center rounded-2xl border-[1.5px] border-border bg-surface text-text-secondary hover:text-brand"><ArrowLeft className="size-5" /></Link>
        <div className="flex-1">
          <p className="truncate text-sm font-semibold text-text">{cfg.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div>
            <span className="text-xs text-text-muted">{allCards.length - queue.length}/{allCards.length}</span>
          </div>
        </div>
      </div>

      {current && (
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="[perspective:1200px]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => { interacted.current = true; setFlipped((f) => !f); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); interacted.current = true; setFlipped((f) => !f); } }}
            aria-label="Lật thẻ"
            aria-pressed={flipped}
            className={
              "relative min-h-[300px] w-full cursor-pointer rounded-3xl border-[1.5px] border-border bg-surface p-6 text-center transition-transform duration-300 [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none " +
              (flipped ? "[transform:rotateY(180deg)]" : "")
            }
          >
            {/* Mặt trước */}
            <div className="flex flex-col items-center justify-center gap-3 [backface-visibility:hidden]">
              {current.image_url && <img src={current.image_url} alt="" className="h-32 w-full rounded-2xl object-cover" />}
              <p className="font-display text-3xl font-extrabold text-text">{current.term}</p>
              {current.ipa && <p className="font-mono text-text-secondary">{current.ipa}</p>}
              <div onClick={(e) => e.stopPropagation()}>
                <PronounceButton term={current.term} audioUrl={current.audio_url} voiceKey={cfg.tts_voice} rate={cfg.tts_rate} />
              </div>
              <span className="mt-2 text-xs text-text-muted">Chạm để lật thẻ</span>
            </div>
            {/* Mặt sau */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <p className="font-display text-2xl font-bold text-text">{current.meaning}</p>
              {current.pos && <StatusBadge tone="info">{current.pos}</StatusBadge>}
              {current.example && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-text-secondary"><ExampleText text={current.example} /></p>
                  <PronounceButton term={current.example.replace(/\*/g, "")} voiceKey={cfg.tts_voice} rate={cfg.tts_rate} size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => advance("learning")} className="rounded-full border-[1.5px] border-border bg-surface px-4 py-3 text-sm font-semibold text-text hover:bg-surface-alt">Tiếp tục</button>
        <button onClick={() => advance("known")} className="rounded-full bg-success px-4 py-3 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-success-bold)] active:translate-y-0.5 active:shadow-none">Tôi đã biết</button>
      </div>
    </div>
  );
}

export default function VocabStudyPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  return <StudyScreen deckId={Number(deckId)} />;
}
