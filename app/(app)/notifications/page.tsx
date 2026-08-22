"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  listNotifications, markAllNotificationsRead, markNotificationRead,
} from "@/lib/api/notifications";
import type { AppNotification, NotificationListResponse } from "@/lib/types/notification";
import { NOTIFICATION_LABEL } from "@/lib/types/notification";
import { useAccessGuard } from "@/lib/access-guard";
import { cn } from "@/lib/utils";
import { KIND_META, timeAgo } from "@/features/notifications/notification-bell";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <NotificationsInner />
    </Suspense>
  );
}

function NotificationsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { allowed, ready } = useAccessGuard((u) => u.role === "student", "/teacher");

  const filter = (params.get("filter") as "all" | "unread") || "all";
  const page = Number(params.get("page")) || 1;

  const [res, setRes] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return listNotifications(filter, page)
      .then(setRes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được thông báo."))
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  function setParam(patch: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); }
    router.replace(`/notifications${p.toString() ? `?${p}` : ""}`);
  }

  function openItem(n: AppNotification) {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
      setRes((r) => (r ? { ...r, data: r.data.map((x) => (x.id === n.id ? { ...x, read: true } : x)) } : r));
    }
    if (n.url) router.push(n.url);
  }

  async function readAll() {
    await markAllNotificationsRead().catch(() => {});
    setRes((r) => (r ? { ...r, data: r.data.map((x) => ({ ...x, read: true })) } : r));
  }

  if (!ready) return <ListSkeleton />;
  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">Thông báo</p>
          <h1 className="mt-1 font-display text-[clamp(24px,4vw,34px)] font-bold leading-tight text-text">Tất cả thông báo</h1>
        </div>
        <button onClick={readAll} className="btn btn-secondary">
          <CheckCheck className="size-4" strokeWidth={2.75} /> Đánh dấu đã đọc tất cả
        </button>
      </div>

      {/* Lọc */}
      <div className="inline-flex rounded-full border-[1.5px] border-divider bg-neutral-100 p-1">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} onClick={() => setParam({ filter: f === "all" ? null : f, page: null })}
            className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f ? "bg-accent text-bg" : "text-neutral-600 hover:text-accent-700")}>
            {f === "all" ? "Tất cả" : "Chưa đọc"}
          </button>
        ))}
      </div>

      {error && !res ? (
        <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">{error}</p>
          <button onClick={() => load()} className="btn btn-primary mt-4">Thử lại</button>
        </div>
      ) : loading && !res ? (
        <ListSkeleton bare />
      ) : !res || res.data.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 px-4 py-16 text-center text-sm text-neutral-600">
          {filter === "unread" ? "Không có thông báo chưa đọc." : "Chưa có thông báo nào."}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {res.data.map((n) => {
              const { icon: Icon, wrap } = KIND_META[n.kind] ?? KIND_META.mission;
              return (
                <li key={n.id}>
                  <button onClick={() => openItem(n)}
                    className={cn("flex w-full items-start gap-3 rounded-[var(--radius-lg)] border-[1.5px] p-4 text-left transition-colors hover:border-accent-300",
                      n.read ? "border-divider bg-neutral-100" : "border-accent-200 bg-accent-100/50")}>
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", wrap)}>
                      <Icon className="size-5" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-text">{n.title}</span>
                        <span className="rounded-full bg-accent-2-200 px-2 py-0.5 text-[10px] font-bold text-accent-2-900">{NOTIFICATION_LABEL[n.kind]}</span>
                        {!n.read && <span className="size-2 rounded-full bg-accent" />}
                      </span>
                      <span className="mt-0.5 block text-sm text-neutral-700">{n.body}</span>
                      <span className="mt-1 block text-xs text-neutral-500">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {res.meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}
                className="btn btn-secondary disabled:opacity-40">Trước</button>
              <span className="text-sm text-neutral-600">Trang {res.meta.current_page}/{res.meta.last_page}</span>
              <button disabled={page >= res.meta.last_page} onClick={() => setParam({ page: String(page + 1) })}
                className="btn btn-secondary disabled:opacity-40">Sau</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListSkeleton({ bare }: { bare?: boolean } = {}) {
  return (
    <div className="flex flex-col gap-4">
      {!bare && <div className="h-10 w-56 animate-pulse rounded-lg bg-neutral-200" />}
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />)}
    </div>
  );
}
