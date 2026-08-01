import { api } from "@/lib/api";

export type DictResult = {
  found: boolean;
  word: string;
  ipa?: string | null;
  pos?: string | null;
  meaning_vi?: string | null;
  matched_from?: string | null;
};

export function lookupWord(word: string): Promise<DictResult> {
  return api(`/dictionary?word=${encodeURIComponent(word)}`);
}

export function saveVocab(payload: { word: string; meaning?: string | null; ipa?: string | null }): Promise<{ saved: boolean }> {
  return api("/me/vocab", { method: "POST", body: JSON.stringify(payload) });
}
