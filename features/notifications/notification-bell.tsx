"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ClipboardList, CheckCircle2, AlarmClock, MessageSquareText, type LucideIcon } from "lucide-react";
import {
  getUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead,
} from "@/lib/api/notifications";
import type { AppNotification, NotificationKind } from "@/lib/types/notification";
import { cn } from "@/lib/utils";

export const KIND_META: Record<NotificationKind, { icon: LucideIcon; wrap: string }> = {
  mission: { icon: ClipboardList, wrap: "bg-info-soft text-info" },
  graded: { icon: CheckCircle2, wrap: "bg-accent-2-200 text-accent-2-800" },
  deadline: { icon: AlarmClock, wrap: "bg-warning-soft text-warning" },
  note: { icon: MessageSquareText, wrap: "bg-accent-100 text-accent-700" },
};

/** Thời gian tương đối tiếng Việt. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 172800) return "Hôm qua";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function NotificationBell({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    getUnreadCount().then((r) => setUnread(r.count)).catch(() => {});
  }, []);

  // Poll số chưa đọc mỗi 60s + khi focus lại tab.
  useEffect(() => {
    refreshCount();
    const iv = setInterval(() => { if (document.visibilityState === "visible") refreshCount(); }, 60000);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    window.addEventListener("notifications:changed", refreshCount);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notifications:changed", refreshCount);
    };
  }, [refreshCount]);

  // Click ngoài / Esc → đóng.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      listNotifications("all", 1).then((r) => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false));
    }
  }

  function openItem(n: AppNotification) {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  function readAll() {
    markAllNotificationsRead().catch(() => {});
    setItems((list) => list?.map((x) => ({ ...x, read: true })) ?? null);
    setUnread(0);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Thông báo" aria-expanded={open}
        className={cn("relative flex items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-text transition-colors hover:border-brand hover:text-brand-bold", compact ? "size-10" : "size-11")}>
        <Bell className="size-[18px]" strokeWidth={2.75} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-display text-sm font-bold text-text">Thông báo</span>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs font-semibold text-brand hover:underline">Đánh dấu đã đọc tất cả</button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-alt" />)}
              </div>
            ) : !items || items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-text-muted">Chưa có thông báo nào.</p>
            ) : (
              items.slice(0, 8).map((n) => {
                const { icon: Icon, wrap } = KIND_META[n.kind] ?? KIND_META.mission;
                return (
                  <button key={n.id} onClick={() => openItem(n)}
                    className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt", !n.read && "bg-brand-soft/40")}>
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", wrap)}>
                      <Icon className="size-[18px]" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-text">{n.title}</span>
                        {!n.read && <span className="size-2 shrink-0 rounded-full bg-brand" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] text-text-secondary">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-text-muted">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-brand hover:bg-surface-alt">
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
