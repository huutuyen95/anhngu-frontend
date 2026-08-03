"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { QuestionEditor, type DraftQuestion } from "@/features/tests/question-editor";

/** Bọc QuestionEditor thành item kéo-thả (dnd-kit) — có handle ⠿ + hỗ trợ bàn phím. */
export function SortableQuestion({ id, index, scorePerQuestion, question, disabled, onChange, onRemove, onDuplicate }: {
  id: string;
  index: number;
  scorePerQuestion?: number;
  question: DraftQuestion;
  disabled?: boolean;
  onChange: (q: DraftQuestion) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.85 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {!disabled && (
        <button {...attributes} {...listeners} aria-label={`Kéo để đổi thứ tự câu ${index + 1}`}
          className="absolute -left-1 top-3 z-[1] flex size-6 cursor-grab touch-none items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
      )}
      <div className={disabled ? "" : "pl-5"}>
        <QuestionEditor index={index} scorePerQuestion={scorePerQuestion} question={question} disabled={disabled}
          onChange={onChange} onRemove={onRemove} onDuplicate={onDuplicate} />
      </div>
    </div>
  );
}
