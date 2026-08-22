import { api, apiForm } from "@/lib/api";
import type {
  Card,
  CardListResponse,
  CardImportPreview,
  Deck,
  DeckListResponse,
  DeckCategory,
  IpaResult,
  LibraryDeck,
  StudyDeck,
} from "@/lib/types/deck";
import type { VoiceKey } from "@/lib/tts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Admin: decks ──

export type DeckFilters = { q?: string; classroom_id?: string; category_id?: string; is_published?: string; page?: string; per_page?: string };

export function listDecks(filters: DeckFilters = {}): Promise<DeckListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, String(v));
  const q = qs.toString();
  return api<DeckListResponse>(`/decks${q ? `?${q}` : ""}`);
}

export function getDeck(id: number): Promise<{ deck: Deck }> {
  return api(`/decks/${id}`);
}

export type DeckPayload = {
  name?: string;
  category_id?: number | null;
  classroom_ids?: number[];
  description?: string | null;
  tts_voice?: VoiceKey;
  tts_rate?: number;
  tts_repeat?: string;
  is_published?: boolean;
};

export function createDeck(payload: DeckPayload): Promise<{ deck: Deck }> {
  return api("/decks", { method: "POST", body: JSON.stringify(payload) });
}
export function updateDeck(id: number, payload: DeckPayload): Promise<{ deck: Deck }> {
  return api(`/decks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export function publishDeck(id: number, isPublished: boolean): Promise<{ is_published: boolean }> {
  return api(`/decks/${id}/publish`, { method: "PATCH", body: JSON.stringify({ is_published: isPublished }) });
}
export function deleteDeck(id: number): Promise<{ message: string }> {
  return api(`/decks/${id}`, { method: "DELETE" });
}
export function duplicateDeck(id: number): Promise<{ deck: Deck }> {
  return api(`/decks/${id}/duplicate`, { method: "POST" });
}

export function listDeckCategories(): Promise<{ data: DeckCategory[] }> {
  return api('/deck-categories');
}

export function syncDeckCategories(payload: {
  categories: { id: number | null; name: string; order: number }[];
  deleted_ids: number[];
}): Promise<{ data: DeckCategory[] }> {
  return api('/deck-categories/sync', { method: 'PUT', body: JSON.stringify(payload) });
}

// ── Admin: cards ──

export function listCards(deckId: number, opts: { q?: string; missing?: string; page?: number; per_page?: number } = {}): Promise<CardListResponse> {
  const qs = new URLSearchParams();
  if (opts.q) qs.set("q", opts.q);
  if (opts.missing) qs.set("missing", opts.missing);
  if (opts.page && opts.page > 1) qs.set("page", String(opts.page));
  if (opts.per_page) qs.set("per_page", String(opts.per_page));
  const q = qs.toString();
  return api(`/decks/${deckId}/cards${q ? `?${q}` : ""}`);
}

export type CardPayload = { term: string; meaning: string; pos?: string | null; ipa?: string | null; example?: string | null };

export function createCard(deckId: number, payload: CardPayload): Promise<{ card: Card }> {
  return api(`/decks/${deckId}/cards`, { method: "POST", body: JSON.stringify(payload) });
}
export function updateCard(id: number, payload: Partial<CardPayload>): Promise<{ card: Card }> {
  return api(`/cards/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export function deleteCard(id: number): Promise<{ message: string }> {
  return api(`/cards/${id}`, { method: "DELETE" });
}
export function reorderCards(deckId: number, ids: number[]): Promise<{ message: string }> {
  return api(`/decks/${deckId}/cards/reorder`, { method: "PUT", body: JSON.stringify({ ids }) });
}
export function moveCard(id: number, direction: -1 | 1): Promise<{ message: string }> {
  return api(`/cards/${id}/move`, { method: "PATCH", body: JSON.stringify({ direction }) });
}
export function deleteCardAudio(id: number): Promise<{ message: string }> {
  return api(`/cards/${id}/audio`, { method: "DELETE" });
}

function upload(path: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiForm<Record<string, string>>(path, form);
}
export function uploadCardImage(id: number, file: File) {
  return upload(`/cards/${id}/image`, file);
}
export function uploadCardAudio(id: number, file: File) {
  return upload(`/cards/${id}/audio`, file);
}

export function ipaLookup(words: string[]): Promise<{ results: IpaResult }> {
  return api(`/ipa/lookup?words=${encodeURIComponent(words.join(","))}`);
}

export function cardsImportTemplateUrl(): string {
  return `${API_URL}/decks/cards-import-template`;
}

function importFormData(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}
export function previewCardsImport(deckId: number, file: File): Promise<CardImportPreview> {
  return apiForm(`/decks/${deckId}/cards/import?dry_run=1`, importFormData(file));
}
export function commitCardsImport(
  deckId: number,
  file: File,
  opts: { auto_ipa: boolean; overwrite: boolean },
): Promise<{ created: number; updated: number; skipped: number; error: number }> {
  return apiForm(
    `/decks/${deckId}/cards/import?auto_ipa=${opts.auto_ipa ? 1 : 0}&overwrite=${opts.overwrite ? 1 : 0}`,
    importFormData(file),
  );
}

// ── Student ──

export function listLibraryDecks(): Promise<{ data: LibraryDeck[] }> {
  return api("/library/decks");
}
// classroomId: có = học TRONG LỚP (tiến độ tách theo lớp); không = tự luyện Thư viện.
export function getStudyDeck(id: number, classroomId?: number): Promise<StudyDeck> {
  const q = classroomId ? `?classroom_id=${classroomId}` : "";
  return api(`/decks/${id}/study${q}`);
}
export function saveCardProgress(cardId: number, status: string, classroomId?: number): Promise<{ status: string }> {
  return api(`/cards/${cardId}/progress`, {
    method: "PUT",
    body: JSON.stringify({ status, ...(classroomId ? { classroom_id: classroomId } : {}) }),
  });
}
export function completeDeckSession(
  deckId: number,
  durationSeconds: number,
  classroomId?: number,
): Promise<{ known: number; total: number; mission_done: boolean }> {
  return api(`/decks/${deckId}/session-complete`, {
    method: "POST",
    body: JSON.stringify({ duration_seconds: durationSeconds, ...(classroomId ? { classroom_id: classroomId } : {}) }),
  });
}
