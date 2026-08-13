import { api, apiForm } from "@/lib/api";
import type { Profile, ProfileUpdate } from "@/lib/types/profile";

export function getMe(): Promise<Profile> {
  return api<Profile>("/me");
}

export function updateProfile(payload: ProfileUpdate): Promise<{ user: Profile }> {
  return api("/me", { method: "PUT", body: JSON.stringify(payload) });
}

export function uploadAvatar(blob: Blob): Promise<{ avatar_url: string }> {
  const form = new FormData();
  form.append("avatar", blob, "avatar.jpg");
  return apiForm<{ avatar_url: string }>("/me/avatar", form);
}

export function deleteAvatar(): Promise<{ avatar_url: null }> {
  return api("/me/avatar", { method: "DELETE" });
}

export function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string; token: string }> {
  return api("/me/password", { method: "PUT", body: JSON.stringify(payload) });
}

export function logoutOthers(): Promise<{ revoked_count: number }> {
  return api("/me/logout-others", { method: "POST" });
}
