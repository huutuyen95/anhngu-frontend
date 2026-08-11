import { api, apiForm } from "@/lib/api";
import type {
  SettingChangesResponse,
  SettingsResponse,
  SettingValue,
} from "@/lib/types/setting";

export function getSettings(): Promise<SettingsResponse> {
  return api<SettingsResponse>("/admin/settings");
}

export function updateSettings(
  values: Record<string, SettingValue>,
): Promise<{ saved: Record<string, SettingValue> }> {
  return api("/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

export function resetSettingsGroup(group: string): Promise<{ message: string }> {
  return api("/admin/settings/reset", {
    method: "POST",
    body: JSON.stringify({ group }),
  });
}

export function uploadSettingFile(key: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("key", key);
  form.append("file", file);
  return apiForm<{ url: string }>("/admin/settings/upload", form);
}

export function deleteSettingFile(key: string): Promise<{ message: string }> {
  return api("/admin/settings/file", {
    method: "DELETE",
    body: JSON.stringify({ key }),
  });
}

export function getSettingChanges(page = 1): Promise<SettingChangesResponse> {
  return api<SettingChangesResponse>(`/admin/settings/changes?page=${page}`);
}

export function revertSettingChange(id: number): Promise<{ message: string }> {
  return api(`/admin/settings/changes/${id}/revert`, { method: "POST" });
}

export function testMail(
  to: string,
  config: Record<string, SettingValue>,
): Promise<{ ok: boolean; message: string }> {
  return api("/admin/settings/mail/test", {
    method: "POST",
    body: JSON.stringify({ to, config }),
  });
}
