"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

type HandleProps = { attributes: DraggableAttributes; listeners: SyntheticListenerMap | undefined; isDragging: boolean };

/** Bọc một item kéo-thả (dnd-kit) chung — trả handleProps để gắn lên nút kéo tuỳ ý. */
export function Sortable({ id, disabled, className, children }: {
  id: string;
  disabled?: boolean;
  className?: string;
  children: (h: HandleProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}
