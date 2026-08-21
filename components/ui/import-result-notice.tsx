import { CheckCircle2 } from "lucide-react";

export function ImportResultNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border-[1.5px] border-success/30 bg-success-soft px-4 py-3" role="status">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="text-sm text-text-secondary">{detail}</p>
      </div>
    </div>
  );
}
