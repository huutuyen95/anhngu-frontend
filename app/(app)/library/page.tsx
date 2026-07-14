"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  BookOpen,
  Mic,
  Folder,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LibraryItem = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  href: string | null;
};

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    key: "tests",
    label: "Đề thi",
    description: "Luyện đề, nộp bài và xem lời giải",
    icon: ClipboardList,
    iconBg: "bg-blue-50",
    iconColor: "text-[#0a2a5e]",
    href: "/tests",
  },
  {
    key: "vocab",
    label: "Từ vựng",
    description: "Học từ vựng bằng flashcard",
    icon: BookOpen,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    href: "/library/vocab",
  },
  {
    key: "speaking",
    label: "Luyện nói",
    description: "Luyện phát âm và phản xạ nói",
    icon: Mic,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    href: null,
  },
  {
    key: "documents",
    label: "Tài liệu",
    description: "Tổng hợp tài liệu học tập",
    icon: Folder,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    href: null,
  },
  {
    key: "articles",
    label: "Bài viết",
    description: "Bài đọc và mẹo học tiếng Anh",
    icon: FileText,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    href: null,
  },
];

export default function LibraryPage() {
  const { user } = useAuth();
  const [deckCount, setDeckCount] = useState<number | null>(null);
  const [deckCountLoading, setDeckCountLoading] = useState(true);

  useEffect(() => {
    api<{ id: number }[]>("/decks")
      .then((decks) => setDeckCount(decks.length))
      .catch((err) => {
        if (!(err instanceof ApiError)) throw err;
      })
      .finally(() => setDeckCountLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Thư viện</h1>
        <p className="mt-1 text-muted-foreground">
          {user
            ? `Chào ${user.name}, chọn nội dung để bắt đầu học`
            : "Chọn nội dung để bắt đầu học"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LIBRARY_ITEMS.map((item) => {
          const Icon = item.icon;

          const description =
            item.key === "vocab" ? (
              deckCountLoading ? (
                <Skeleton className="mt-1 h-4 w-24" />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {deckCount !== null ? `${deckCount} bộ từ` : item.description}
                </p>
              )
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            );

          const cardBody = (
            <Card
              className={cn(
                "h-full p-6 transition duration-200",
                item.href
                  ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                  : "opacity-70",
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full",
                    item.iconBg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", item.iconColor)} />
                </div>
                {!item.href && <Badge variant="secondary">Sắp có</Badge>}
              </div>

              <h2 className="mt-4 font-semibold text-foreground">
                {item.label}
              </h2>
              {description}
            </Card>
          );

          return item.href ? (
            <Link key={item.key} href={item.href} className="block">
              {cardBody}
            </Link>
          ) : (
            <div key={item.key} className="cursor-not-allowed">
              {cardBody}
            </div>
          );
        })}
      </div>
    </div>
  );
}
