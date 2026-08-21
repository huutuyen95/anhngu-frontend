"use client";

import type { RefObject } from "react";
import { useSelectionDictionary } from "@/hooks/useSelectionDictionary";
import { DictionaryPopover } from "@/features/documents/dictionary-popover";

/**
 * Bôi đen một từ tiếng Anh trong lúc làm bài → hiện nghĩa + phiên âm + nút nghe.
 *
 * Bật/tắt do SERVER quyết (`dictionary_enabled` trong trạng thái lượt làm), không phải FE
 * tự đoán: bài cô giao ở lớp tính như bài kiểm tra nên luôn tắt, em phải tự làm. Thư viện
 * và Nhiệm vụ em tự thêm thì cho tra vì mục đích là học.
 *
 * Dùng chung cho cả 4 màn làm bài (hỗn hợp · đọc · viết · nói) — mỗi màn chỉ việc gắn ref
 * vào khung nội dung của mình rồi đặt component này vào cuối.
 */
export function AttemptDictionary({
  enabled,
  containerRef,
}: {
  enabled: boolean;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const { popup, result, loading, close } = useSelectionDictionary(enabled, containerRef);

  if (!popup) return null;

  return <DictionaryPopover popup={popup} result={result} loading={loading} onClose={close} />;
}
