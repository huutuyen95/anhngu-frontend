"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FolderPlus, Layers, Search } from "lucide-react";
import { listTestCategories } from "@/lib/api/tests";
import { TEST_GROUPS, type TestCategory, type TestGroup } from "@/lib/types/test";
import { cn } from "@/lib/utils";
import { useSlidingIndicator } from "@/lib/use-sliding-indicator";

/**
 * Cột trái — cây thư mục theo NHÓM nội dung (Đề thi / Bài tập), độc lập với lớp.
 * Chọn thư mục → lọc bảng theo category_id. Giống hệ cũ.
 */
export function TestFolderTree({ selected, onSelect, onManage, reloadKey }: {
  selected: string; // "" = tất cả; hoặc category id
  onSelect: (categoryId: string | null) => void;
  onManage: (group: TestGroup) => void;
  reloadKey: number;
}) {
  const [expanded, setExpanded] = useState<Set<TestGroup>>(new Set(["exam"]));
  const [cats, setCats] = useState<Record<TestGroup, TestCategory[]>>({ exam: [], exercise: [] });
  const [q, setQ] = useState("");

  const loadCats = useCallback((group: TestGroup) => {
    listTestCategories(group).then((r) => setCats((m) => ({ ...m, [group]: r.data }))).catch(() => {});
  }, []);

  function toggle(group: TestGroup) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(group)) n.delete(group); else { n.add(group); loadCats(group); }
      return n;
    });
  }

  // Nạp lại thư mục các nhóm đang mở khi có thay đổi.
  useEffect(() => {
    for (const group of expanded) loadCats(group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, loadCats]);

  const filter = (list: TestCategory[]) =>
    (q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list)
      .filter((c) => c.name !== "Chưa phân loại");

  // Pill trượt khi đổi thư mục; đo lại khi mở/thu nhóm, nạp thư mục, hoặc lọc.
  const { box, setRef } = useSlidingIndicator(selected, [expanded, cats, q]);

  return (
    <aside className="flex w-full flex-col gap-3 lg:w-[250px] lg:shrink-0">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm thư mục…"
          className="h-9 w-full rounded-full border-[1.5px] border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:border-brand" />
      </div>

      <div className="relative rounded-2xl border-[1.5px] border-border bg-surface p-2">
        {box && (
          <span aria-hidden
            className={cn("pointer-events-none absolute top-0 rounded-xl bg-brand-soft",
              box.animate && "transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]")}
            style={{ transform: `translate(${box.left}px, ${box.top}px)`, width: box.width, height: box.height }} />
        )}
        <button onClick={() => onSelect(null)} ref={setRef("")}
          className={cn("relative z-10 mb-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors",
            selected === "" ? "text-brand" : "text-text hover:bg-surface-alt")}>
          <Layers className="size-4" /> Tất cả đề
        </button>

        {TEST_GROUPS.map((node) => {
          const list = filter(cats[node.key] ?? []);
          const isOpen = expanded.has(node.key);
          return (
            <div key={node.key}>
              <div className="flex items-center">
                <button onClick={() => toggle(node.key)} aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                  className="flex flex-1 items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-text-secondary hover:bg-surface-alt">
                  {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="truncate">{node.label}</span>
                </button>
                <button onClick={() => onManage(node.key)} aria-label={`Thêm thư mục nhóm ${node.label}`}
                  className="flex size-7 items-center justify-center rounded-lg text-text-muted hover:text-brand"><FolderPlus className="size-4" /></button>
              </div>
              {isOpen && (
                <div className="ml-4 flex flex-col border-l border-border pl-2">
                  {list.length === 0 ? (
                    <span className="px-2.5 py-1.5 text-xs text-text-muted">Chưa có thư mục</span>
                  ) : list.map((c) => (
                    <FolderNode key={c.id} cat={c} selected={selected} onSelect={onSelect} setRef={setRef} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-text-secondary">
        Thư mục là kho đề dùng chung, không theo lớp. Đề chưa gán nằm ở “Chưa phân loại”.
      </p>
    </aside>
  );
}

/** Một thư mục (kèm thư mục con nếu có). */
function FolderNode({ cat, selected, onSelect, setRef }: {
  cat: TestCategory;
  selected: string;
  onSelect: (id: string) => void;
  setRef: (key: string | number) => (el: HTMLElement | null) => void;
}) {
  return (
    <>
      <button onClick={() => onSelect(String(cat.id))} ref={setRef(String(cat.id))}
        className={cn("relative z-10 flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
          selected === String(cat.id) ? "font-semibold text-brand" : "text-text hover:bg-surface-alt")}>
        <span className="truncate">{cat.name}</span>
        <span className="shrink-0 rounded-full bg-surface-alt px-1.5 text-xs text-text-muted">{cat.tests_count}</span>
      </button>
      {cat.children?.length > 0 && (
        <div className="ml-3 flex flex-col border-l border-border pl-2">
          {cat.children.map((child) => (
            <FolderNode key={child.id} cat={child} selected={selected} onSelect={onSelect} setRef={setRef} />
          ))}
        </div>
      )}
    </>
  );
}
