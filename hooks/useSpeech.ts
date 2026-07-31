"use client";

import { useEffect, useState } from "react";
import { hasEnglishVoice, isSpeechSupported, stopSpeaking } from "@/lib/tts";

/** Kiểm tra thiết bị có đọc được tiếng Anh không (async vì voices nạp trễ). */
export function useSpeechSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    if (!isSpeechSupported()) {
      setSupported(false);
      return;
    }
    hasEnglishVoice().then((ok) => alive && setSupported(ok));

    const onUnload = () => stopSpeaking();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      alive = false;
      window.removeEventListener("beforeunload", onUnload);
      stopSpeaking();
    };
  }, []);

  return supported;
}
