"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, AudioLines } from "lucide-react";
import { speak, stopSpeaking, type VoiceKey } from "@/lib/tts";
import { useSpeechSupport } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";

type Props = {
  /** Nội dung đọc (từ hoặc câu ví dụ đã bỏ dấu *). */
  text: string;
  audioUrl?: string | null;
  voiceKey: VoiceKey;
  rate: number;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
};

/**
 * Nút "Nghe" có nhãn. Ưu tiên mp3 (audioUrl) → nếu không có thì TTS đọc `text`.
 * Thiết bị không đọc được tiếng Anh và không có mp3 → nút disable kèm chữ. stopPropagation để
 * không lật thẻ khi bấm.
 */
export function SpeakButton({ text, audioUrl, voiceKey, rate, label, variant = "secondary", className }: Props) {
  const supported = useSpeechSupport();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    stopSpeaking();
  }, []);

  const unsupported = !audioUrl && supported === false;

  async function handle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (unsupported) return;
    if (playing) {
      audioRef.current?.pause();
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    try {
      if (audioUrl) {
        const a = new Audio(audioUrl);
        audioRef.current = a;
        a.onended = () => setPlaying(false);
        await a.play();
      } else {
        await speak({ text, voiceKey, rate, repeat: 1 });
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }

  if (unsupported) {
    return <span className="text-xs font-medium text-neutral-500">Thiết bị không đọc được</span>;
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      className={cn("btn", variant === "primary" ? "btn-primary" : "btn-secondary", className)}
    >
      {playing ? <AudioLines className="size-4" strokeWidth={2.75} /> : <Volume2 className="size-4" strokeWidth={2.75} />}
      {label}
    </button>
  );
}
