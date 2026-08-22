import { api } from "@/lib/api";
import type { NotificationListResponse } from "@/lib/types/notification";

export function listNotifications(filter: "all" | "unread" = "all", page = 1): Promise<NotificationListResponse> {
  const qs = new URLSearchParams({ filter, page: String(page) });
  return api<NotificationListResponse>(`/me/notifications?${qs.toString()}`);
}

export function getUnreadCount(): Promise<{ count: number }> {
  return api<{ count: number }>("/me/notifications/unread-count");
}

/** Phát event để chuông (và các nơi khác) cập nhật số chưa đọc ngay lập tức. */
function announceChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("notifications:changed"));
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/me/notifications/${id}/read`, { method: "POST" }).then((r) => { announceChange(); return r; });
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return api<{ updated: number }>("/me/notifications/read-all", { method: "POST" }).then((r) => { announceChange(); return r; });
}
