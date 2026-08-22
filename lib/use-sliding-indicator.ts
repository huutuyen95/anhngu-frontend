"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SlideBox = { top: number; left: number; width: number; height: number; animate: boolean };

/**
 * Pill chỉ báo trượt cho tab/menu: đo hộp của phần tử active (relative offsetParent),
 * lần đầu đặt chỗ tức thì, các lần sau bật transition để trượt từ A sang B. Dùng cho cả
 * tab ngang lẫn cây dọc (thụt lề khác nhau) vì đo đủ top/left/width/height.
 *
 * - `activeKey`: khoá của mục đang chọn.
 * - `deps`: các giá trị làm ĐỔI layout (mở/thu nhóm, số mục, lọc…) để đo lại kịp thời.
 * - Gắn `setRef(key)` cho từng mục; active không hiển thị (nằm trong nhóm đã thu) → `box=null` (ẩn pill).
 */
export function useSlidingIndicator(activeKey: string | number, deps: unknown[] = []) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const firstRun = useRef(true);
  const [box, setBox] = useState<SlideBox | null>(null);

  const measure = useCallback(() => {
    const el = refs.current[String(activeKey)];
    // Không đo khi mục đang ẩn (nhóm thu gọn, hoặc khu bị display:none ở breakpoint nhỏ):
    // offsetParent null → giữ pill ẩn cho tới khi hiển thị lại (resize sẽ đo lại).
    if (!el || el.offsetParent === null) {
      setBox(null);
      return;
    }
    setBox({
      top: el.offsetTop,
      left: el.offsetLeft,
      width: el.offsetWidth,
      height: el.offsetHeight,
      animate: !firstRun.current,
    });
    firstRun.current = false;
  }, [activeKey]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { measure(); }, [measure, ...deps]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const setRef = (key: string | number) => (el: HTMLElement | null) => {
    refs.current[String(key)] = el;
  };

  return { box, setRef };
}
