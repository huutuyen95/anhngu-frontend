"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lookupWord, type DictResult } from "@/lib/api/dictionary";

export type SelectionPopup = { x: number; y: number; word: string };

const CACHE_KEY = "dict-cache-v1";
const WORD_RE = /^[A-Za-z][A-Za-z'-]{0,30}$/;

function readCache(): Record<string, DictResult> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeCache(word: string, r: DictResult) {
  try {
    const c = readCache();
    c[word] = r;
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch { /* localStorage đầy → bỏ qua */ }
}

/**
 * Bôi đen 1 từ tiếng Anh trong `containerRef` → tra từ điển (popover).
 * Tắt hoàn toàn khi enabled=false (dùng khi đang làm bài thi).
 * Có cache localStorage để tra lại offline.
 */
export function useSelectionDictionary(enabled: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const [popup, setPopup] = useState<SelectionPopup | null>(null);
  const [result, setResult] = useState<DictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const close = useCallback(() => { setPopup(null); setResult(null); }, []);

  useEffect(() => {
    if (!enabled) { setPopup(null); return; }
    function onUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!WORD_RE.test(text)) return;
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      if (containerRef.current && !containerRef.current.contains(node)) return;
      const rect = range.getBoundingClientRect();
      setPopup({ x: rect.left + rect.width / 2, y: rect.top, word: text });
    }
    // Bấm ra ngoài popover → đóng (mousedown, để không chặn click nút "Lưu" bên trong).
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement)?.closest?.("[data-dict-popover]")) setPopup(null);
    }
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("mousedown", onDown);
    };
  }, [enabled, containerRef]);

  useEffect(() => {
    if (!popup) return;
    const key = popup.word.toLowerCase();
    const cached = readCache()[key];
    if (cached) { setResult(cached); setLoading(false); return; }
    const id = ++reqId.current;
    setLoading(true);
    setResult(null);
    lookupWord(popup.word)
      .then((r) => { if (id === reqId.current) { setResult(r); writeCache(key, r); } })
      .catch(() => { if (id === reqId.current) setResult({ found: false, word: popup.word }); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [popup]);

  return { popup, result, loading, close };
}
