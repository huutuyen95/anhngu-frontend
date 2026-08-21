import type { VoiceKey } from "@/lib/tts";
import type { ClassroomRef } from "@/lib/types/student";

export type { ClassroomRef };

export type DeckCategory = { id: number; name: string; order?: number; decks_count?: number };

export type Deck = {
  id: number;
  name: string;
  description: string | null;
  tts_voice: VoiceKey;
  tts_rate: number;
  tts_repeat: string; // '1' | '2' | 'auto'
  is_published: boolean;
  owner_name?: string;
  category: DeckCategory | null;
  category_id: number | null;
  classrooms?: ClassroomRef[];
  classroom_ids?: number[];
  cards_count?: number;
  audio_ready_count?: number;
  created_at?: string | null;
};

export type DeckListResponse = {
  data: Deck[];
  meta: { current_page: number; last_page: number; total: number };
};

export type Card = {
  id: number;
  order: number;
  term: string;
  meaning: string;
  pos: string | null;
  ipa: string | null;
  audio_url: string | null;
  image_url: string | null;
  example: string | null;
  progress_status?: "new" | "learning" | "known";
};

export type CardListResponse = {
  data: Card[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
  };
};

export type LibraryDeck = {
  id: number;
  name: string;
  cards_count: number;
  learned_count: number;
  category: DeckCategory | null;
  classrooms: ClassroomRef[];
};

export type StudyDeck = {
  deck: { id: number; name: string; tts_voice: VoiceKey; tts_rate: number; tts_repeat: string };
  progress?: { known: number; total: number };
  cards: Card[];
};

export type CardImportRow = {
  row: number;
  term: string;
  meaning: string;
  ipa: string | null;
  pos: string | null;
  status: "ok" | "need_ipa" | "duplicate" | "error";
  reasons: string[];
};

export type CardImportPreview = {
  rows: CardImportRow[];
  summary: { ok: number; need_ipa: number; duplicate: number; error: number };
};

export type IpaResult = Record<string, { ipa: string | null; pos: string | null }>;

export const VOICE_OPTIONS: { key: VoiceKey; label: string }[] = [
  { key: "en-GB-female", label: "Anh–Anh (Nữ)" },
  { key: "en-GB-male", label: "Anh–Anh (Nam)" },
  { key: "en-US-female", label: "Anh–Mỹ (Nữ)" },
  { key: "en-US-male", label: "Anh–Mỹ (Nam)" },
];

export const TTS_RATES = [0.7, 0.8, 0.9, 1.0, 1.1] as const;
