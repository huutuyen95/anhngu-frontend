/**
 * Phát âm bằng Web Speech API (window.speechSynthesis) — chạy trên máy client, không tốn phí.
 * Ưu tiên: file mp3 (xử lý ở component) → TTS đọc `term`. Không đọc chuỗi IPA.
 */

export type VoiceKey = "en-GB-female" | "en-GB-male" | "en-US-female" | "en-US-male";

const FEMALE_HINTS = ["female", "samantha", "karen", "victoria", "moira", "tessa", "fiona", "serena", "kate", "zira", "hazel", "susan", "linda"];
const MALE_HINTS = ["male", "daniel", "alex", "fred", "oliver", "arthur", "george", "david", "mark"];

let cached: SpeechSynthesisVoice[] | null = null;
let unloadBound = false;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function ensureUnloadCleanup(): void {
  if (unloadBound || typeof window === "undefined") return;
  unloadBound = true;
  window.addEventListener("beforeunload", () => stopSpeaking());
}

/** Nạp danh sách voice (Chrome nạp bất đồng bộ → chờ voiceschanged). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);
  ensureUnloadCleanup();
  if (cached && cached.length) return Promise.resolve(cached);

  return new Promise((resolve) => {
    let settled = false;
    const done = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      if (voices.length) cached = voices;
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(voices);
    };
    const handler = () => done(window.speechSynthesis.getVoices());

    const got = window.speechSynthesis.getVoices();
    if (got.length) {
      done(got);
      return;
    }
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => done(window.speechSynthesis.getVoices()), 800);
  });
}

function englishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
}

/** Có giọng tiếng Anh để đọc hay không. */
export async function hasEnglishVoice(): Promise<boolean> {
  if (!isSpeechSupported()) return false;
  return englishVoices(await loadVoices()).length > 0;
}

function pickVoice(voices: SpeechSynthesisVoice[], key: VoiceKey): SpeechSynthesisVoice | null {
  const en = englishVoices(voices);
  if (!en.length) return null;

  const wantUK = key.startsWith("en-GB");
  const wantFemale = key.endsWith("female");
  const langMatch = en.filter((v) =>
    wantUK ? v.lang.toLowerCase().includes("gb") || v.lang.toLowerCase().includes("uk") : v.lang.toLowerCase().includes("us"),
  );
  const pool = langMatch.length ? langMatch : en;

  const genderMatch = pool.find((v) => {
    const n = v.name.toLowerCase();
    const hints = wantFemale ? FEMALE_HINTS : MALE_HINTS;
    return hints.some((h) => n.includes(h));
  });

  return genderMatch ?? pool[0];
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/** Dừng mọi phát âm đang chạy. */
export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

/**
 * Đọc `text` bằng giọng đã chọn. Huỷ phát cũ trước khi phát mới. Đọc lặp `repeat` lần.
 * PHẢI được gọi trực tiếp trong user gesture (onClick) để iOS Safari không chặn.
 */
export async function speak(opts: {
  text: string;
  voiceKey: VoiceKey;
  rate: number;
  repeat?: number;
}): Promise<void> {
  if (!isSpeechSupported()) return;
  ensureUnloadCleanup();
  stopSpeaking();

  const voices = await loadVoices();
  const voice = pickVoice(voices, opts.voiceKey);
  const times = Math.max(1, opts.repeat ?? 1);

  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(opts.text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-GB";
      u.rate = Math.min(1.5, Math.max(0.5, opts.rate));
      u.onend = () => resolve();
      u.onerror = () => resolve();
      currentUtterance = u;
      window.speechSynthesis.speak(u);
    });
    if (i < times - 1) await new Promise((r) => setTimeout(r, 350));
  }
  currentUtterance = null;
}
