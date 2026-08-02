import type { ReactNode } from "react";

/** Render câu ví dụ, in đậm phần bọc trong *dấu sao*. */
export function ExampleText({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") ? (
          <b key={i} className="font-bold text-brand">{p.slice(1, -1)}</b>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
