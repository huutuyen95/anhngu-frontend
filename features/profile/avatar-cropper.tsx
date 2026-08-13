"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";

const VIEW = 280; // kích thước khung crop hiển thị (px)
const OUT = 400; // kích thước ảnh xuất

/** Modal crop ảnh vuông: kéo để dời, thanh trượt để phóng to. Xuất blob JPEG 400×400. */
export function AvatarCropper({
  file,
  onCancel,
  onDone,
  uploading,
}: {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
  uploading: boolean;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Scale nền: ảnh phủ kín khung vuông ở zoom = 1.
  const baseScale = img ? VIEW / Math.min(img.width, img.height) : 1;
  const scale = baseScale * zoom;
  const dispW = img ? img.width * scale : 0;
  const dispH = img ? img.height * scale : 0;

  function clampAt(zoomVal: number, x: number, y: number) {
    const s = baseScale * zoomVal;
    const w = img ? img.width * s : 0;
    const h = img ? img.height * s : 0;
    return { x: Math.min(0, Math.max(VIEW - w, x)), y: Math.min(0, Math.max(VIEW - h, y)) };
  }
  function clamp(x: number, y: number) {
    return clampAt(zoom, x, y);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clamp(nx, ny));
  }
  function onPointerUp() {
    drag.current = null;
  }

  function confirm() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = OUT / VIEW;
    ctx.drawImage(img, offset.x * r, offset.y * r, dispW * r, dispH * r);
    canvas.toBlob((blob) => blob && onDone(blob), "image/jpeg", 0.9);
  }

  return (
    <Modal open onClose={onCancel} title="Cắt ảnh đại diện">
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden rounded-full border-[1.5px] border-divider bg-neutral-200 touch-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="max-w-none select-none"
              style={{ position: "absolute", left: offset.x, top: offset.y, width: dispW, height: dispH }}
            />
          )}
        </div>

        <label className="flex w-full max-w-[280px] items-center gap-3">
          <span className="text-xs font-semibold text-neutral-600">Thu nhỏ</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoom(z);
              setOffset((o) => clampAt(z, o.x, o.y));
            }}
            className="flex-1 accent-[var(--color-accent)]"
            aria-label="Phóng to ảnh"
          />
          <span className="text-xs font-semibold text-neutral-600">Phóng to</span>
        </label>

        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={uploading}>
            Huỷ
          </button>
          <button type="button" onClick={confirm} className="btn btn-primary" disabled={uploading || !img}>
            {uploading ? "Đang tải lên…" : "Dùng ảnh này"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
