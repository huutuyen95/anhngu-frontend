"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";

export default function MissionsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-text">Nhiệm vụ</h1>
      <p className="mt-1 text-text-secondary">
        Đây là màn hình chính sau khi đăng nhập. Danh sách nhiệm vụ cô giao sẽ hiển thị ở đây.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-border bg-surface p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <ListChecks className="size-7" />
        </span>
        <p className="font-semibold text-text">Chưa có nhiệm vụ nào</p>
        <p className="text-sm text-text-muted">
          Tính năng giao bài đang được phát triển (Sprint 3). Trong lúc chờ, em có thể
          vào Thư viện để tự luyện.
        </p>
        <Link
          href="/library"
          className="mt-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-bold)] transition-all hover:bg-brand-bold active:translate-y-0.5 active:shadow-none"
        >
          Vào Thư viện
        </Link>
      </div>
    </div>
  );
}
