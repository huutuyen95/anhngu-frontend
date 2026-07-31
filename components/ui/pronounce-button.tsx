"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, AudioLines, VolumeX } from "lucide-react";
import { speak, stopSpeaking, type VoiceKey } from "@/lib/tts";
import { useSpeechSupport } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";

type Props = {
  term: string;
  audioUrl?: string | null;
  voiceKey: VoiceKey;
  rate: number;
  repeat?: number;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Nút nghe phát âm. Ưu tiên file mp3 (audioUrl) → nếu không có thì TTS đọc `term`.
 * Thiết bị không có giọng English + không có mp3 → disable kèm chữ "Thiết bị không đọc được".
 */
export function PronounceButton({ term, audioUrl, voiceKey, rate, repeat = 1, size = "md", className }: Props) {
  const supported = useSpeechSupport();
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      stopSpeaking();
    };
  }, []);

  // Không có mp3 và thiết bị không đọc được → disable.
  const unsupported = !audioUrl && supported === false;

  async function handleClick() {
    if (unsupported) return;
    if (playing) {
      audioRef.current?.pause();
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setErrored(false);
    setPlaying(true);
    try {
      if (audioUrl) {
        const a = new Audio(audioUrl);
        audioRef.current = a;
        a.onended = () => setPlaying(false);
        a.onerror = () => { setErrored(true); setPlaying(false); };
        await a.play();
      } else {
        await speak({ text: term, voiceKey, rate, repeat });
        setPlaying(false);
      }
    } catch {
      setErrored(true);
      setPlaying(false);
    }
  }

  const box = size === "sm" ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={unsupported}
      aria-label={
        unsupported
          ? `Thiết bị không đọc được từ ${term}`
          : `Nghe phát âm từ ${term}`
      }
      title={unsupported ? "Thiết bị không đọc được từ này" : undefined}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-brand",
        box,
        unsupported
          ? "cursor-not-allowed text-text-muted"
          : playing
            ? "bg-brand text-white"
            : "text-brand hover:bg-brand-soft",
        className
      )}
    >
      {unsupported ? (
        <VolumeX />
      ) : playing ? (
        <AudioLines className="motion-safe:animate-pulse" />
      ) : (
        <Volume2 />
      )}
      {errored && <span className="sr-only">Lỗi phát âm</span>}
    </button>
  );
}
