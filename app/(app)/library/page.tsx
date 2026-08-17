"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileText,
  FolderOpen,
  Mic2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listLibraryDecks } from "@/lib/api/decks";
import { cn } from "@/lib/utils";

type LibraryItem = {
  key: string;
  label: string;
  eyebrow: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  href: string | null;
};

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    key: "tests",
    label: "Luyện đề",
    eyebrow: "Đề thi",
    description: "Làm bài theo từng kỹ năng và xem lại kết quả của em.",
    detail: "Reading · Listening · Writing · Speaking",
    icon: ClipboardList,
    href: "/library/tests",
  },
  {
    key: "vocab",
    label: "Học từ vựng",
    eyebrow: "Flashcard",
    description: "Ôn từ bằng flashcard, nghe phát âm và theo dõi tiến độ riêng.",
    detail: "Học theo chủ đề · Luyện nghe và viết",
    icon: BookOpen,
    href: "/library/vocab",
  },
  {
    key: "documents",
    label: "Đọc tài liệu",
    eyebrow: "Học liệu",
    description: "Mở bài giảng, tài liệu và nội dung cô đã chuẩn bị cho em.",
    detail: "Tìm kiếm · Lọc theo danh mục",
    icon: FolderOpen,
    href: "/library/documents",
  },
  {
    key: "speaking",
    label: "Luyện nói",
    eyebrow: "Phát âm",
    description: "Luyện phát âm và phản xạ giao tiếp.",
    detail: "Nghe · Nói · Phản xạ",
    icon: Mic2,
    href: null,
  },
  {
    key: "articles",
    label: "Bài viết",
    eyebrow: "Góc học tập",
    description: "Bài đọc ngắn và mẹo học tiếng Anh.",
    detail: "Bài đọc · Kinh nghiệm học",
    icon: FileText,
    href: "/library/articles",
  },
];

export default function LibraryPage() {
  const { user } = useAuth();
  const [deckCount, setDeckCount] = useState<number | null>(null);
  const [deckCountLoading, setDeckCountLoading] = useState(true);

  useEffect(() => {
    let active = true;

    listLibraryDecks()
      .then((response) => {
        if (active) setDeckCount(response.data.length);
      })
      .catch(() => {
        if (active) setDeckCount(null);
      })
      .finally(() => {
        if (active) setDeckCountLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">
            Thư viện học tập
          </p>
          <h1 className="mt-1 font-display text-[clamp(30px,5vw,46px)] font-bold leading-tight text-text">
            Hôm nay em muốn học gì?
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            {user ? `Chào ${user.name}, chọn một nội dung và bắt đầu buổi học của em nhé.` : "Chọn một nội dung và bắt đầu buổi học của em nhé."}
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border-[1.5px] border-accent-300 bg-accent-100 px-3.5 py-2 text-xs font-bold text-accent-800">
          <Sparkles className="size-4" strokeWidth={2.75} />
          4 khu học liệu đang mở
        </span>
      </header>

      <section aria-labelledby="library-open-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="library-open-title" className="font-display text-xl font-bold text-text sm:text-2xl">
            Bắt đầu học
          </h2>
          <p className="hidden text-sm text-neutral-500 sm:block">Tiến độ được lưu riêng theo tài khoản của em</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {LIBRARY_ITEMS.map((item) => (
            <LibraryCard
              key={item.key}
              item={item}
              deckCount={item.key === "vocab" ? deckCount : null}
              deckCountLoading={item.key === "vocab" && deckCountLoading}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function LibraryCard({
  item,
  deckCount,
  deckCountLoading,
}: {
  item: LibraryItem;
  deckCount: number | null;
  deckCountLoading: boolean;
}) {
  const Icon = item.icon;
  const active = item.href !== null;

  const card = (
    <div
      aria-disabled={active ? undefined : true}
      className={cn(
        "group flex min-h-72 flex-col rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-5 text-neutral-900 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color,opacity] duration-200 sm:p-6",
        active
          ? "hover:-translate-y-1 hover:border-accent-300 hover:shadow-[var(--shadow-md)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transform-none"
          : "cursor-not-allowed opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-13 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <Icon className="size-6" strokeWidth={2.75} />
        </span>

        {item.key === "vocab" ? (
          <span className="rounded-full border border-divider bg-surface px-3 py-1.5 text-xs font-extrabold text-accent-800">
            {deckCountLoading ? (
              <span className="block h-4 w-14 animate-pulse rounded-full bg-neutral-200" aria-label="Đang tải số bộ từ" />
            ) : deckCount !== null ? (
              `${deckCount} bộ từ`
            ) : (
              "Nhiều chủ đề"
            )}
          </span>
        ) : !active ? (
          <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-neutral-600">
            Sắp có
          </span>
        ) : null}
      </div>

      <div className="mt-7">
        <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-neutral-600">{item.eyebrow}</p>
        <h3 className="mt-1 font-display text-2xl font-bold text-text">{item.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">{item.description}</p>
      </div>

      <div className="mt-auto border-t border-divider pt-4">
        <p className="text-xs font-semibold text-neutral-600">{item.detail}</p>
        <span
          className={cn(
            "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors",
            active
              ? "bg-accent text-neutral-100 group-hover:bg-accent-600"
              : "bg-neutral-200 text-neutral-500",
          )}
        >
          {active ? "Vào học" : "Chưa mở"}
          {active && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" strokeWidth={2.75} />}
        </span>
      </div>
    </div>
  );

  return active ? (
    <Link
      href={item.href!}
      className="block rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
