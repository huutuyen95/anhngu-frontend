"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ImageIcon, Play } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getStudyDeck } from "@/lib/api/decks";
import type { Card, StudyDeck } from "@/lib/types/deck";
import type { VoiceKey } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { ExampleText } from "@/features/vocabulary/example-text";
import { SpeakButton } from "@/features/vocabulary/speak-button";

type Props = {
  deckId: number;
  classroomId?: number;
  backHref: string;
  studyHref: string;
  progressLabel: string;
};

function titleCase(value: string): string {
  return value.replace(/(^|\s)(\p{L})/gu, (_match, space, character) => space + character.toLocaleUpperCase("vi"));
}

export function DeckDetail({ deckId, classroomId, backHref, studyHref, progressLabel }: Props) {
  const [data, setData] = useState<StudyDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  useEffect(() => {
    let active = true;
    getStudyDeck(deckId, classroomId)
      .then((response) => { if (active) setData(response); })
      .catch((reason) => {
        if (active) setError(reason instanceof ApiError ? reason.message : "Không tải được bộ từ.");
      });
    return () => { active = false; };
  }, [classroomId, deckId]);

  const toggle = useCallback((id: number) => {
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-6 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
        <Link href={backHref} className="btn btn-secondary mt-4">Quay lại</Link>
      </div>
    );
  }
  if (!data) return <DeckDetailSkeleton />;

  const known = data.progress?.known ?? 0;
  const total = data.progress?.total ?? data.cards.length;
  const progress = total > 0 ? (known / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={backHref} aria-label="Quay lại" className="btn btn-icon btn-secondary shrink-0">
          <ArrowLeft className="size-5" strokeWidth={2.5} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">Bộ từ vựng</p>
          <h1 className="truncate font-display text-[clamp(24px,4vw,34px)] font-bold leading-tight text-text">{data.deck.name}</h1>
          <p className="mt-0.5 text-sm text-neutral-600">{total} từ · nghe và xem trước từng thẻ</p>
        </div>
        {total > 0 ? (
          <Link href={studyHref} className="btn btn-primary shrink-0">
            <Play className="size-4" strokeWidth={2.75} /> Bắt đầu học
          </Link>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-600">
          <span>{progressLabel}</span>
          <span>{known}/{total} từ đã thuộc</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {data.cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.cards.map((card, index) => (
            <VocabCard
              key={card.id}
              card={card}
              index={index + 1}
              flipped={flipped.has(card.id)}
              onToggle={() => toggle(card.id)}
              voiceKey={data.deck.tts_voice}
              rate={data.deck.tts_rate}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-neutral-600">Bộ từ này chưa có thẻ để học.</div>
      )}
    </div>
  );
}

function VocabCard({ card, index, flipped, onToggle, voiceKey, rate }: {
  card: Card;
  index: number;
  flipped: boolean;
  onToggle: () => void;
  voiceKey: VoiceKey;
  rate: number;
}) {
  const known = card.progress_status === "known";
  const meaning = titleCase(card.meaning);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`Thẻ ${card.term} — chạm để lật`}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className="group h-44 cursor-pointer rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="h-full [perspective:800px] transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:transform-none [@media(hover:none)]:group-hover:transform-none">
        <div className={cn(
          "relative h-full w-full transition-transform duration-[550ms] [transform-style:preserve-3d] [transform-origin:center] ease-in-out motion-reduce:transition-none",
          flipped && "[transform:rotateY(180deg)]",
        )}>
          <CardFace>
            <CardBody card={card} meaning={meaning} known={known} index={index}>
              <SpeakButton text={card.term} audioUrl={card.audio_url} voiceKey={voiceKey} rate={rate} label="Nghe từ" variant="secondary" className="mt-1 min-h-10 px-4 py-1 text-sm" />
            </CardBody>
          </CardFace>
          <CardFace back>
            <CardBody card={card} meaning={meaning} known={known} index={index}>
              {card.example ? (
                <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug text-neutral-700">
                  Ví dụ: “<ExampleText text={card.example} />”
                </p>
              ) : null}
              <SpeakButton text={(card.example ?? card.term).replace(/\*/g, "")} audioUrl={card.example ? null : card.audio_url} voiceKey={voiceKey} rate={rate} label={card.example ? "Nghe cả câu" : "Nghe từ"} variant="primary" className="mt-1 min-h-10 px-4 py-1 text-sm" />
            </CardBody>
          </CardFace>
        </div>
      </div>
    </div>
  );
}

function CardFace({ children, back }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div className={cn(
      "absolute inset-0 flex overflow-hidden rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-3 shadow-[var(--shadow-sm)] transition-[box-shadow,border-color] duration-150 [backface-visibility:hidden] group-hover:border-accent-300 group-hover:shadow-[var(--shadow-md)]",
      back && "[transform:rotateY(180deg)]",
    )}>
      {children}
    </div>
  );
}

function CardImage({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex aspect-square h-full shrink-0 items-center justify-center rounded-2xl bg-neutral-200 text-neutral-400">
        <ImageIcon className="size-10" strokeWidth={2} />
      </div>
    );
  }
  return (
    <div className="aspect-square h-full shrink-0 overflow-hidden rounded-2xl bg-neutral-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
    </div>
  );
}

function CardBody({ card, meaning, known, index, children }: {
  card: Card;
  meaning: string;
  known: boolean;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full items-stretch gap-4">
      <CardImage src={card.image_url} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="leading-snug">
            <span className="font-display text-[22px] font-bold text-text">{card.term}</span>{" "}
            <span className="text-[15px] text-neutral-600">({meaning})</span>
          </p>
          <span
            aria-label={known ? "Đã thuộc" : "Chưa thuộc"}
            title={known ? "Đã thuộc" : "Chưa thuộc"}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              known ? "bg-accent-2-500 text-neutral-100" : "border-[1.5px] border-divider text-neutral-500",
            )}
          >
            {known ? <Check className="size-4" strokeWidth={3} /> : index}
          </span>
        </div>
        {card.ipa ? <p className="font-mono text-[13px] text-neutral-500">{card.ipa}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function DeckDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-12 w-72 animate-pulse rounded-lg bg-neutral-200" />
      <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}
