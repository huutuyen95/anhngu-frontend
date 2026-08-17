"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, ImageIcon, Keyboard, Mic, PartyPopper, RotateCcw, Volume2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { completeDeckSession, getStudyDeck, saveCardProgress } from "@/lib/api/decks";
import type { Card } from "@/lib/types/deck";
import type { VoiceKey } from "@/lib/tts";
import { speak } from "@/lib/tts";
import { ExampleText } from "@/features/vocabulary/example-text";
import { SpeakButton } from "@/features/vocabulary/speak-button";

type DeckCfg = { id: number; name: string; tts_voice: VoiceKey; tts_rate: number; tts_repeat: string };
type StudyPhase = "preview" | "dictation" | "spelling" | "pronunciation";
type AnswerState = "correct" | "incorrect" | null;
type PronunciationState = "idle" | "listening" | "correct" | "incorrect" | "unsupported";

type SpeechRecognitionResultEventLike = {
  results: ArrayLike<{ [index: number]: { transcript: string }; length: number }>;
};

type SpeechRecognitionErrorEventLike = { error: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
let feedbackAudioContext: AudioContext | null = null;

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replaceAll("’", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpokenAnswer(value: string): string {
  return normalizeAnswer(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function prepareFeedbackSound(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  feedbackAudioContext ??= new window.AudioContext();
  if (feedbackAudioContext.state === "suspended") void feedbackAudioContext.resume();
  return feedbackAudioContext;
}

function playCorrectSound(): void {
  const context = prepareFeedbackSound();
  if (!context) return;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
  [659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.11);
    oscillator.stop(context.currentTime + 0.24 + index * 0.11);
  });
}

function shuffledLetters(term: string, seed: number): string[] {
  const letters = Array.from(term.toLocaleUpperCase("en")).filter((character) => /[\p{L}\p{N}]/u.test(character));
  return letters
    .map((letter, index) => ({ letter, score: ((seed + 11) * (index + 7) * 2654435761) % 2147483647 }))
    .sort((a, b) => a.score - b.score)
    .map(({ letter }) => letter);
}

type Props = {
  deckId: number;
  /** Có = học TRONG LỚP (tiến độ tách theo lớp + đánh dấu nhiệm vụ lớp). */
  classroomId?: number;
  /** Dòng phụ dưới tên bộ (vd "Buổi 1 · Lớp 6A1 · học trong lớp" / "Tự luyện · Thư viện"). */
  subtitle?: string;
  /** Đích nút ‹ quay lại (màn chi tiết bộ từ, hoặc danh sách Thư viện). */
  backHref: string;
  /** Đích + nhãn nút ở màn Hoàn thành (vd "Về buổi học" / "Về Nhiệm vụ"). */
  doneHref: string;
  doneLabel: string;
};

/** Màn flashcard lật 3D — dùng chung cho học trong lớp và tự luyện Thư viện. */
export function DeckStudy({ deckId, classroomId, subtitle, backHref, doneHref, doneLabel }: Props) {
  const [cfg, setCfg] = useState<DeckCfg | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [queue, setQueue] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [phase, setPhase] = useState<StudyPhase>("preview");
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [pronunciationState, setPronunciationState] = useState<PronunciationState>("idle");
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0);
  const [heardText, setHeardText] = useState("");
  const [checking, setChecking] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [done, setDone] = useState(false);
  const interacted = useRef(false);
  const startedAt = useRef(0);
  const answerRef = useRef<HTMLInputElement | null>(null);
  const spellingRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const current = queue[0] ?? null;

  const load = useCallback(() => {
    getStudyDeck(deckId, classroomId).then((r) => {
      setCfg(r.deck);
      setAllCards(r.cards);
      const learn = r.cards.filter((c) => c.progress_status !== "known");
      setQueue(learn.length ? learn : r.cards);
      setKnownCount(0);
      setDone(false);
      setFlipped(false);
      setPhase("preview");
      setAnswer("");
      setAnswerState(null);
      setPronunciationState("idle");
      setPronunciationAttempts(0);
      setHeardText("");
      setChecking(false);
      startedAt.current = Date.now();
    });
  }, [deckId, classroomId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  // Tự đọc term khi hiện thẻ mới (chỉ khi tts_repeat='auto' + đã tương tác — iOS).
  useEffect(() => {
    if (phase === "preview" && cfg?.tts_repeat === "auto" && current && !flipped && interacted.current && !current.audio_url) {
      speak({ text: current.term, voiceKey: cfg.tts_voice, rate: cfg.tts_rate, repeat: 1 });
    }
  }, [current, flipped, cfg, phase]);

  const finishCurrent = useCallback(async (saveProgress: boolean) => {
    if (!current) return;
    interacted.current = true;
    if (saveProgress) {
      try {
        await saveCardProgress(current.id, "known", classroomId);
      } catch {
        toast.error("Chưa lưu được tiến độ của em.");
        return;
      }
    }
    const next = queue.slice(1);
    setQueue(next);
    if (next.length === 0) {
      setDone(true);
      completeDeckSession(deckId, Math.round((Date.now() - startedAt.current) / 1000), classroomId)
        .then((response) => { if (response.mission_done) toast.success("Đã hoàn thành nhiệm vụ của buổi học!"); })
        .catch(() => {});
    }
    setKnownCount((count) => count + 1);
    setFlipped(false);
    setPhase("preview");
    setAnswer("");
    setAnswerState(null);
    setPronunciationState("idle");
    setPronunciationAttempts(0);
    setHeardText("");
  }, [classroomId, current, deckId, queue]);

  function startDictation() {
    if (!current || !cfg) return;
    interacted.current = true;
    setFlipped(false);
    setPhase("dictation");
    setAnswer("");
    setAnswerState(null);
    if (current.audio_url) {
      new Audio(current.audio_url).play().catch(() => {});
    } else {
      speak({ text: current.term, voiceKey: cfg.tts_voice, rate: cfg.tts_rate, repeat: 1 });
    }
    window.setTimeout(() => answerRef.current?.focus(), 100);
  }

  async function checkAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !answer.trim() || checking) return;
    if (answerState === "correct") {
      setPhase("spelling");
      setAnswer("");
      setAnswerState(null);
      window.setTimeout(() => spellingRef.current?.focus(), 100);
      return;
    }

    const correct = normalizeAnswer(answer) === normalizeAnswer(current.term);
    if (correct) playCorrectSound();
    setChecking(true);
    try {
      await saveCardProgress(current.id, "learning", classroomId);
      setAnswerState(correct ? "correct" : "incorrect");
    } catch {
      toast.error("Chưa chấm được đáp án, em thử lại nhé.");
    } finally {
      setChecking(false);
    }
  }

  async function checkSpelling(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !answer.trim() || checking) return;
    if (answerState === "correct") {
      setPhase("pronunciation");
      setAnswer("");
      setAnswerState(null);
      setPronunciationState("idle");
      return;
    }

    const correct = normalizeAnswer(answer) === normalizeAnswer(current.term);
    if (correct) playCorrectSound();
    setChecking(true);
    try {
      await saveCardProgress(current.id, "learning", classroomId);
      setAnswerState(correct ? "correct" : "incorrect");
    } catch {
      toast.error("Chưa chấm được đáp án, em thử lại nhé.");
    } finally {
      setChecking(false);
    }
  }

  function startPronunciation() {
    if (!current || !cfg || pronunciationState === "listening") return;
    prepareFeedbackSound();
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setPronunciationState("unsupported");
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = cfg.tts_voice.startsWith("en-US") ? "en-US" : "en-GB";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    setPronunciationState("listening");
    setHeardText("");
    setPronunciationAttempts((attempts) => Math.min(attempts + 1, 3));

    let settled = false;
    recognition.onresult = (event) => {
      settled = true;
      const transcripts = Array.from(event.results).flatMap((result) =>
        Array.from({ length: result.length }, (_, index) => result[index]?.transcript ?? ""),
      );
      const matched = transcripts.some((transcript) => normalizeSpokenAnswer(transcript) === normalizeSpokenAnswer(current.term));
      setHeardText(transcripts[0] ?? "");
      if (!matched) {
        setPronunciationState("incorrect");
        return;
      }
      setChecking(true);
      saveCardProgress(current.id, "known", classroomId)
        .then(() => {
          setPronunciationState("correct");
          playCorrectSound();
        })
        .catch(() => {
          setPronunciationState("idle");
          toast.error("Chưa lưu được kết quả phát âm, em thử lại nhé.");
        })
        .finally(() => setChecking(false));
    };
    recognition.onerror = (event) => {
      settled = true;
      setPronunciationState(event.error === "not-allowed" || event.error === "service-not-allowed" ? "unsupported" : "incorrect");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (!settled) setPronunciationState("incorrect");
    };

    try {
      recognition.start();
    } catch {
      setPronunciationState("unsupported");
    }
  }

  // Bàn phím (desktop).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (phase === "preview" && e.key === " ") {
        e.preventDefault();
        interacted.current = true;
        setFlipped((currentFlipped) => !currentFlipped);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, phase]);

  if (!cfg) return <div className="mx-auto max-w-md p-4"><div className="h-72 animate-pulse rounded-3xl bg-neutral-200" /></div>;

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
        <PartyPopper className="size-14 text-accent motion-safe:animate-bounce" strokeWidth={2.5} />
        <h1 className="font-display text-2xl font-bold text-text">Hoàn thành!</h1>
        <p className="text-neutral-700">Em đã học {knownCount} từ trong bộ “{cfg.name}”.</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button onClick={load} className="btn btn-primary w-full">Học lại tất cả</button>
          <Link href={doneHref} className="btn btn-secondary w-full">{doneLabel}</Link>
        </div>
      </div>
    );
  }

  const seen = allCards.length - queue.length;
  const progress = allCards.length ? (seen / allCards.length) * 100 : 0;

  const pos = Math.min(seen + 1, allCards.length);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header đầy đủ: quay lại + tên bộ/dòng phụ · thanh tiến độ + số thẻ */}
      <header className="flex items-center gap-4 border-b border-divider pb-5">
        <Link href={backHref} aria-label="Quay lại" className="btn btn-icon btn-secondary shrink-0">
          <ArrowLeft className="size-5" strokeWidth={2.5} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold text-text sm:text-xl">{cfg.name}</h1>
          {subtitle && <p className="truncate text-[13px] text-neutral-600">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200 sm:w-44">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-semibold text-neutral-600">{pos}/{allCards.length}</span>
        </div>
      </header>

      {current && (
        <div className="mx-auto w-full max-w-3xl">
          {phase === "preview" ? (
          <>
          <div className="[perspective:1200px]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => { interacted.current = true; setFlipped((f) => !f); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); interacted.current = true; setFlipped((f) => !f); } }}
              aria-label="Lật thẻ"
              aria-pressed={flipped}
              className={
                "relative h-[420px] w-full cursor-pointer transition-transform duration-[600ms] [transform-style:preserve-3d] [transform-origin:center] ease-in-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none sm:h-[460px] " +
                (flipped ? "[transform:rotateY(180deg)]" : "")
              }
            >
              {/* Mặt trước — nền/viền nằm trên mặt để lật nguyên tấm thẻ */}
              <StudyFace>
                <span className="absolute right-6 top-5 text-sm font-medium text-neutral-500">Bấm thẻ để lật</span>
                <Thumb key={current.id} src={current.image_url} />
                <p className="mt-6 font-display text-[clamp(38px,6vw,56px)] font-extrabold leading-none text-text">{current.term}</p>
                {current.ipa && <p className="mt-3 font-mono text-lg text-neutral-600">{current.ipa}</p>}
                <SpeakButton text={current.term} audioUrl={current.audio_url} voiceKey={cfg.tts_voice} rate={cfg.tts_rate} label="Nghe từ" variant="secondary" className="mt-6 min-h-[52px] px-7 text-base" />
              </StudyFace>

              {/* Mặt sau */}
              <StudyFace back>
                <span className="absolute right-6 top-5 text-sm font-medium text-neutral-500">Bấm thẻ để lật</span>
                <p className="font-display text-[clamp(28px,4vw,38px)] font-bold text-text">{current.meaning}</p>
                {current.pos && <span className="tag tag-accent-2 mt-3 text-sm">{current.pos}</span>}
                {current.example && (
                  <div className="mt-5 flex flex-col items-center gap-3">
                    <p className="max-w-lg text-lg text-neutral-700">Ví dụ : “<ExampleText text={current.example} />”</p>
                    <SpeakButton text={current.term} audioUrl={current.audio_url} voiceKey={cfg.tts_voice} rate={cfg.tts_rate} label="Nghe từ" variant="primary" className="min-h-[52px] px-7 text-base" />
                  </div>
                )}
              </StudyFace>
            </div>
          </div>

          {/* Nút hành động to */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button onClick={() => void finishCurrent(true)} className="btn btn-secondary min-h-[56px] text-base">Tôi đã biết từ này</button>
            <button onClick={startDictation} className="btn btn-primary min-h-[56px] text-base">Tiếp tục</button>
          </div>
          <p className="mt-4 text-center text-sm text-neutral-500">
            Bấm Tiếp tục để nghe và nhập lại từ vừa học.
          </p>
          </>
          ) : phase === "dictation" ? (
            <form onSubmit={checkAnswer} className="rounded-3xl border-[1.5px] border-divider bg-neutral-100 p-6 shadow-[var(--shadow-sm)] sm:p-10">
              <div className="flex flex-col items-center text-center">
                <span className="flex size-20 items-center justify-center rounded-full border-[1.5px] border-divider bg-surface text-neutral-600">
                  <Volume2 className="size-9" strokeWidth={2.25} />
                </span>
                <p className="mt-5 font-display text-xl font-bold text-text sm:text-2xl">Nghe và viết lại từ em nghe được</p>
                <p className="mt-1 text-sm text-neutral-600">Không phân biệt chữ hoa, chữ thường.</p>
                <SpeakButton
                  text={current.term}
                  audioUrl={current.audio_url}
                  voiceKey={cfg.tts_voice}
                  rate={cfg.tts_rate}
                  label="Nghe lại"
                  variant="secondary"
                  className="mt-5 min-h-12 px-6 text-base"
                />
              </div>

              <label className="mt-7 block">
                <span className="sr-only">Nhập từ em nghe được</span>
                <input
                  ref={answerRef}
                  value={answer}
                  disabled={answerState === "correct"}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    if (answerState === "incorrect") setAnswerState(null);
                  }}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Nhập từ"
                  className={
                    "input min-h-14 w-full text-lg " +
                    (answerState === "correct"
                      ? "border-success bg-success-soft"
                      : answerState === "incorrect"
                        ? "border-danger bg-danger-soft"
                        : "")
                  }
                />
              </label>

              <div aria-live="polite" className="mt-4">
                {answerState === "correct" ? <CorrectPanel card={current} /> : null}
                {answerState === "incorrect" ? (
                  <p className="flex items-center gap-2 font-semibold text-danger">
                    <XCircle className="size-5" /> Chưa đúng, em nghe lại và thử lần nữa nhé.
                  </p>
                ) : null}
              </div>

              <div className="mt-5 flex justify-end">
                <button type="submit" disabled={!answer.trim() || checking} className="btn btn-primary min-h-14 min-w-40 px-7 text-base disabled:cursor-not-allowed disabled:opacity-50">
                  {checking ? "Đang chấm…" : answerState === "correct" ? "Tiếp tục" : "Kiểm tra"}
                  {answerState === "correct" ? <ChevronRight className="size-5" /> : null}
                </button>
              </div>
            </form>
          ) : phase === "spelling" ? (
            <form onSubmit={checkSpelling} className="rounded-3xl border-[1.5px] border-divider bg-neutral-100 p-6 shadow-[var(--shadow-sm)] sm:p-10">
              <div className="flex flex-col items-center text-center">
                <span className="flex size-16 items-center justify-center rounded-full border-[1.5px] border-divider bg-surface text-neutral-600">
                  <Keyboard className="size-8" strokeWidth={2.25} />
                </span>
                <p className="mt-4 font-display text-2xl font-bold text-text sm:text-3xl">{current.meaning}</p>
                <p className="mt-1 text-sm text-neutral-600">Gõ lại từ tiếng Anh theo định nghĩa trên</p>
              </div>

              <div aria-label="Các chữ cái gợi ý" className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2" aria-hidden="true">
                {shuffledLetters(current.term, current.id).map((letter, index) => (
                  <span key={`${letter}-${index}`} className="flex size-11 items-center justify-center rounded-xl border border-divider bg-surface font-display text-base font-bold text-text">
                    {letter}
                  </span>
                ))}
              </div>

              <label className="relative mt-8 block cursor-text" onClick={() => spellingRef.current?.focus()}>
                <span className="sr-only">Gõ từ tiếng Anh bằng bàn phím</span>
                <input
                  ref={spellingRef}
                  value={answer}
                  disabled={answerState === "correct"}
                  onChange={(event) => {
                    setAnswer(event.target.value.slice(0, current.term.length));
                    if (answerState === "incorrect") setAnswerState(null);
                  }}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="absolute inset-0 size-full cursor-text opacity-0"
                />
                <span className="flex flex-wrap justify-center gap-2" aria-hidden="true">
                  {Array.from(current.term).map((character, index) => character === " " ? (
                    <span key={`space-${index}`} className="w-4 sm:w-7" />
                  ) : (
                    <span
                      key={`${character}-${index}`}
                      className={
                        "flex h-14 w-11 items-center justify-center rounded-xl border-2 bg-surface font-display text-xl font-bold uppercase shadow-[var(--shadow-xs)] sm:h-16 sm:w-14 " +
                        (answerState === "correct" ? "border-success text-success" : answerState === "incorrect" ? "border-danger text-danger" : "border-divider text-text")
                      }
                    >
                      {answer[index] ?? <span className="mt-5 h-0.5 w-5 rounded-full bg-neutral-300" />}
                    </span>
                  ))}
                </span>
              </label>

              <div aria-live="polite" className="mt-6">
                {answerState === "correct" ? <CorrectPanel card={current} /> : null}
                {answerState === "incorrect" ? (
                  <p className="flex items-center justify-center gap-2 font-semibold text-danger">
                    <XCircle className="size-5" /> Chưa đúng, em kiểm tra lại các chữ đã gõ nhé.
                  </p>
                ) : null}
              </div>

              <div className="mt-6 flex justify-end">
                <button type="submit" disabled={!answer.trim() || checking} className="btn btn-primary min-h-14 min-w-40 px-7 text-base disabled:cursor-not-allowed disabled:opacity-50">
                  {checking ? "Đang chấm…" : answerState === "correct" ? "Tiếp tục" : "Kiểm tra"}
                  {answerState === "correct" ? <ChevronRight className="size-5" /> : null}
                </button>
              </div>
            </form>
          ) : (
            <section className="rounded-3xl border-[1.5px] border-divider bg-neutral-100 p-6 shadow-[var(--shadow-sm)] sm:p-10">
              <div className="flex flex-col items-center text-center">
                {pronunciationAttempts > 0 ? <p className="text-sm font-semibold text-neutral-600">Số lần thử: {pronunciationAttempts}/3</p> : null}
                <p className="mt-3 font-display text-3xl font-bold text-text sm:text-4xl">{current.term}</p>
                {current.ipa ? <p className="mt-2 font-mono text-lg text-neutral-600">{current.ipa}</p> : null}
                <p className="mt-4 text-lg font-semibold text-neutral-700">Phát âm từ vựng</p>

                {pronunciationState === "idle" || pronunciationState === "listening" ? (
                  <button
                    type="button"
                    onClick={startPronunciation}
                    disabled={pronunciationState === "listening"}
                    aria-label={pronunciationState === "listening" ? "Đang nghe phát âm" : "Bắt đầu phát âm"}
                    className="mt-8 flex size-28 items-center justify-center rounded-full border-[1.5px] border-divider bg-accent-2-200 text-accent-2-800 transition-transform hover:scale-105 disabled:animate-pulse disabled:cursor-wait sm:size-32"
                  >
                    <Mic className="size-12" strokeWidth={2.5} />
                  </button>
                ) : null}
                {pronunciationState === "listening" ? <p className="mt-3 font-semibold text-accent-700">Đang nghe… Em hãy nói rõ từ trên.</p> : null}
              </div>

              <div aria-live="polite" className="mt-8">
                {pronunciationState === "correct" ? <CorrectPanel card={current} /> : null}
                {pronunciationState === "incorrect" ? (
                  <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-2 font-display text-xl font-bold text-danger">
                          <XCircle className="size-6" /> Em phát âm chưa chính xác
                        </p>
                        {heardText ? <p className="mt-2 text-sm text-neutral-600">Hệ thống nghe được: “{heardText}”</p> : null}
                      </div>
                      {pronunciationAttempts < 3 ? (
                        <button type="button" onClick={startPronunciation} className="btn min-h-12 border-danger bg-danger px-6 text-neutral-100 hover:bg-danger/90">
                          Làm lại <RotateCcw className="size-5" />
                        </button>
                      ) : null}
                    </div>
                    <WordDetails card={current} />
                  </div>
                ) : null}
                {pronunciationState === "unsupported" ? (
                  <div className="rounded-2xl border border-divider bg-surface p-5 text-center">
                    <p className="font-semibold text-text">Trình duyệt chưa cho phép sử dụng microphone.</p>
                    <p className="mt-1 text-sm text-neutral-600">Em hãy cấp quyền microphone hoặc dùng Chrome/Edge để luyện phát âm.</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {pronunciationState !== "correct" ? (
                  <button type="button" onClick={() => void finishCurrent(false)} className="btn btn-secondary min-h-12 px-6">
                    Bỏ qua <ChevronRight className="size-5" />
                  </button>
                ) : (
                  <button type="button" onClick={() => void finishCurrent(false)} disabled={checking} className="btn btn-primary min-h-12 px-7">
                    {checking ? "Đang lưu…" : "Tiếp tục"} <ChevronRight className="size-5" />
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** Một mặt thẻ học = tấm thẻ hoàn chỉnh (nền + viền + bóng) → lật là lật nguyên tấm. */
function StudyFace({ children, back }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div
      className={
        "absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-[1.5px] border-divider bg-neutral-100 p-8 text-center shadow-[var(--shadow-sm)] [backface-visibility:hidden] " +
        (back ? "[transform:rotateY(180deg)]" : "")
      }
    >
      {children}
    </div>
  );
}

function CorrectPanel({ card }: { card: Card }) {
  return (
    <div className="rounded-2xl border border-success/30 bg-success-soft p-5 sm:p-6">
      <p className="flex items-center gap-2 font-display text-xl font-bold text-success">
        <CheckCircle2 className="size-6" /> Tuyệt vời!
      </p>
      <WordDetails card={card} />
    </div>
  );
}

function WordDetails({ card }: { card: Card }) {
  return (
    <div className="mt-4 text-left text-text">
      <p className="font-display text-xl font-bold">{card.term}</p>
      {(card.ipa || card.pos) ? (
        <p className="mt-1 font-mono text-sm text-neutral-700">
          {card.ipa} {card.pos ? <span className="ml-2 font-sans">({card.pos})</span> : null}
        </p>
      ) : null}
      <p className="mt-3 font-semibold">Định nghĩa:</p>
      <p className="text-neutral-700">{card.meaning}</p>
    </div>
  );
}

/** Ảnh minh hoạ vuông ở mặt trước thẻ học; ảnh lỗi → icon placeholder (nền sage). */
function Thumb({ src }: { src: string | null }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex size-28 items-center justify-center rounded-3xl bg-accent-2-200 text-accent-2-800">
        <ImageIcon className="size-12" strokeWidth={2} />
      </div>
    );
  }
  return (
    <div className="size-28 overflow-hidden rounded-3xl bg-neutral-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onError={() => setErr(true)} className="size-full object-cover" />
    </div>
  );
}
