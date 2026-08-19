import { api } from "@/lib/api";
import type {
  Mission,
  MissionContentType,
  MissionListResponse,
  MissionTab,
} from "@/lib/types/mission";

/** Danh sách nhiệm vụ tự đặt theo tab ("7 ngày tới" / "Đã hoàn thành"). */
export function listMissions(tab: MissionTab): Promise<MissionListResponse> {
  return api<MissionListResponse>(`/me/missions?tab=${tab}`);
}

/** Thêm một nội dung vào nhiệm vụ — backend tự đặt hạn 7 ngày. */
export function addMission(
  type: MissionContentType,
  id: number,
): Promise<{ mission: Mission }> {
  return api<{ mission: Mission }>("/me/missions", {
    method: "POST",
    body: JSON.stringify({ type, id }),
  });
}

export function removeMission(missionId: number): Promise<{ message: string }> {
  return api<{ message: string }>(`/me/missions/${missionId}`, { method: "DELETE" });
}
