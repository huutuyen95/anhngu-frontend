export type NotificationKind = "mission" | "graded" | "deadline" | "note";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string | null;
  actor_name: string | null;
  read: boolean;
  created_at: string | null;
};

export type NotificationListResponse = {
  data: AppNotification[];
  meta: { current_page: number; last_page: number; total: number };
};

export const NOTIFICATION_LABEL: Record<NotificationKind, string> = {
  mission: "Bài mới",
  graded: "Đã chấm",
  deadline: "Sắp đến hạn",
  note: "Ghi chú",
};
