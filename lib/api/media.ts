import { ApiError, getToken, apiForm } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Upload ảnh/audio (multipart) → trả URL công khai. */
export async function uploadMedia(file: File, type: "image" | "audio"): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("type", type);
  const token = getToken();
  const res = await fetch(`${API_URL}/media/upload`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? "Tải file thất bại.", data?.errors);
  }
  return data;
}

/** Upload 1 ảnh (avatar, ảnh bìa…) → trả { url }. Dùng chung endpoint /media/upload. */
export function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiForm("/media/upload", form);
}
