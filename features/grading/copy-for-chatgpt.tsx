"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Chép sẵn một khối chữ hoàn chỉnh (yêu cầu chấm + đề bài + tiêu chí của cô + bài viết của
 * em) để cô dán thẳng sang ChatGPT của mình rồi tự chấm.
 *
 * Đây là cách chấm cô đang dùng: không qua API, không tốn tiền, không cần khoá. Cô đọc kết
 * quả bên ChatGPT rồi tự nhập điểm + nhận xét vào form bên dưới.
 *
 * `navigator.clipboard` cần chạy trong ngữ cảnh bảo mật (HTTPS hoặc localhost) VÀ ngay trong
 * cú bấm của người dùng — nên nội dung phải có sẵn từ trước, không được fetch rồi mới chép.
 */
export function CopyForChatGpt({ prompt }: { prompt: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!prompt) return null;

  async function copy() {
    try {
      if (!navigator.clipboard) {
        throw new Error("clipboard không khả dụng");
      }

      await navigator.clipboard.writeText(prompt as string);
      setCopied(true);
      toast.success("Đã chép. Cô dán vào ChatGPT để chấm nhé.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Không chép được. Cô bấm vào ô bài viết rồi copy tay giúp em.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-3 text-xs font-bold text-text-secondary transition-colors hover:border-brand hover:text-brand-bold"
      title="Chép đề bài, tiêu chí chấm và bài viết của em thành một khối để dán sang ChatGPT"
    >
      {copied ? <Check className="size-3.5 text-success-bold" /> : <Copy className="size-3.5" />}
      {copied ? "Đã chép" : "Copy cho ChatGPT"}
    </button>
  );
}
