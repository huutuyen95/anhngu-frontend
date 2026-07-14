"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/page-header";

type Deck = {
  id: number;
  name: string;
  slug: string;
  is_public: boolean;
  cards_count: number;
};

export default function VocabPage() {
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Deck[]>("/decks")
      .then(setDecks)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "Không tải được danh sách bộ từ.",
        ),
      );
  }, []);

  return (
    <div>
      <PageHeader
        title="Từ vựng"
        backHref="/library"
        icon={<span className="font-bold">A</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && !decks && (
        <p className="text-sm text-slate-500">Đang tải...</p>
      )}

      {!error && decks && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/library/vocab/${deck.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {deck.name}
              </h2>
              <p className="mb-3 text-sm text-slate-500">
                {deck.cards_count} thẻ
              </p>
              {/* Chưa có API tiến độ tổng hợp theo bộ từ ở Sprint 1 nên để thanh trống */}
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 w-0 rounded-full bg-emerald-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
