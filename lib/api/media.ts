import { apiForm } from "@/lib/api";

/** Upload 1 ảnh (avatar, ảnh bìa…) → trả { url }. Dùng chung endpoint /media/upload. */
export function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiForm("/media/upload", form);
}
