"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type Card = {
  id: number;
  term: string;
  meaning: string;
  ipa: string | null;
  audio_url: string | null;
  image_url: string | null;
  example: string | null;
};

type Deck = {
  id: number;
  name: string;
  cards: Card[];
};

type CardStatus = "new" | "learning" | "known";

export default function VocabDeckPage() {
  const { deck: deckId } = useParams<{ deck: string }>();
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    api<Deck>(`/decks/${deckId}`)
      .then(setDeck)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Không tải được bộ từ.",
        ),
      );
  }, [deckId]);

  function speak(term: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(term);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  async function saveProgress(cardId: number, status: CardStatus) {
    try {
      await api(`/decks/${deckId}/progress`, {
        method: "POST",
        body: JSON.stringify({ card_id: cardId, status }),
      });
    } catch {
      // Không chặn luồng học nếu lưu tiến độ lỗi (vd. mất mạng tạm thời)
    }
  }

  function goNext() {
    if (!deck) return;
    const card = deck.cards[index];
    if (card) saveProgress(card.id, "learning");
    if (index < deck.cards.length - 1) {
      setIndex(index + 1);
      setFlipped(false);
    }
  }

  function goPrev() {
    if (index > 0) {
      setIndex(index - 1);
      setFlipped(false);
    }
  }

  function finish() {
    const card = deck?.cards[index];
    if (card) saveProgress(card.id, "known");
    router.push("/library/vocab");
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!deck) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  const card = deck.cards[index];
  const isLast = index === deck.cards.length - 1;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/library/vocab"
        className="mb-4 inline-block text-sm text-slate-500 hover:underline"
      >
        ← Quay lại danh sách
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">
        {deck.name}
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        Thẻ {index + 1} / {deck.cards.length}
      </p>

      {card && (
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="block w-full [perspective:1000px]"
        >
          <div
            className={`relative h-64 w-full rounded-2xl shadow-sm transition-transform duration-500 [transform-style:preserve-3d] ${
              flipped ? "[transform:rotateY(180deg)]" : ""
            }`}
          >
            {/* Mặt trước: từ + IPA */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 [backface-visibility:hidden]">
              <span className="mb-2 text-4xl">🔤</span>
              <p className="text-2xl font-semibold text-slate-900">
                {card.term}
              </p>
              {card.ipa && <p className="text-slate-500">{card.ipa}</p>}
            </div>

            {/* Mặt sau: nghĩa */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <p className="text-xl font-semibold text-slate-900">
                {card.meaning}
              </p>
              {card.example && (
                <p className="mt-2 text-center text-sm text-slate-500">
                  {card.example}
                </p>
              )}
            </div>
          </div>
        </button>
      )}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => card && speak(card.term)}
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          🔊 Phát âm
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-40"
        >
          ← Trước
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={finish}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Hoàn thành
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Tiếp →
          </button>
        )}
      </div>
    </div>
  );
}
