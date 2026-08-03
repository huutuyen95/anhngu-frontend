"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderPlus, Layers, Search } from "lucide-react";
import { listTestCategories } from "@/lib/api/tests";
import { listClassrooms } from "@/lib/api/classrooms";
import type { TestCategory } from "@/lib/types/test";
import { cn } from "@/lib/utils";

type ClassNode = { id: number; name: string };

/** Cột trái A4 — cây thư mục (Lớp → thư mục con). Chọn thư mục → lọc bảng theo category_id. */
export function TestFolderTree({ selected, onSelect, onManage, reloadKey }: {
  selected: string; // "" = tất cả; hoặc category id
  onSelect: (categoryId: string | null) => void;
  onManage: (classId: number | null) => void;
  reloadKey: number;
}) {
  const [classes, setClasses] = useState<ClassNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number | "shared">>(new Set(["shared"]));
  const [cats, setCats] = useState<Record<string, TestCategory[]>>({});
  const [q, setQ] = useState("");

  const loadCats = useCallback((key: number | "shared") => {
    const classroomId = key === "shared" ? null : key;
    listTestCategories(classroomId).then((r) => setCats((m) => ({ ...m, [String(key)]: r.data }))).catch(() => {});
  }, []);

  function toggle(key: number | "shared") {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else { n.add(key); loadCats(key); }
      return n;
    });
  }

  useEffect(() => {
    listClassrooms().then((r) => setClasses(r.data.map((c) => ({ id: c.id, name: c.name })))).catch(() => setClasses([]));
  }, []);

  // Nạp lại thư mục của các nhánh đang mở khi có thay đổi.
  useEffect(() => {
    for (const key of expanded) loadCats(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, classes, loadCats]);

  const filter = (list: TestCategory[]) =>
    q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list;

  const nodes: { key: number | "shared"; name: string }[] = useMemo(
    () => [{ key: "shared" as const, name: "Dùng chung" }, ...classes.map((c) => ({ key: c.id, name: c.name }))],
    [classes],
  );

  return (
    <aside className="flex w-full flex-col gap-3 lg:w-[250px] lg:shrink-0">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm thư mục…"
          className="h-9 w-full rounded-full border-[1.5px] border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:border-brand" />
      </div>

      <div className="rounded-2xl border-[1.5px] border-border bg-surface p-2">
        <button onClick={() => onSelect(null)}
          className={cn("mb-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors",
            selected === "" ? "bg-brand-soft text-brand" : "text-text hover:bg-surface-alt")}>
          <Layers className="size-4" /> Tất cả đề
        </button>

        {nodes.map((node) => {
          const list = filter(cats[String(node.key)] ?? []);
          const isOpen = expanded.has(node.key);
          return (
            <div key={String(node.key)}>
              <div className="flex items-center">
                <button onClick={() => toggle(node.key)} aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                  className="flex flex-1 items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-text-secondary hover:bg-surface-alt">
                  {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="truncate">{node.name}</span>
                </button>
                <button onClick={() => onManage(node.key === "shared" ? null : node.key)} aria-label="Thêm thư mục"
                  className="flex size-7 items-center justify-center rounded-lg text-text-muted hover:text-brand"><FolderPlus className="size-4" /></button>
              </div>
              {isOpen && (
                <div className="ml-4 flex flex-col border-l border-border pl-2">
                  {list.length === 0 ? (
                    <span className="px-2.5 py-1.5 text-xs text-text-muted">Chưa có thư mục</span>
                  ) : list.map((c) => (
                    <button key={c.id} onClick={() => onSelect(String(c.id))}
                      className={cn("flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                        selected === String(c.id) ? "bg-brand-soft font-semibold text-brand" : "text-text hover:bg-surface-alt")}>
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0 rounded-full bg-surface-alt px-1.5 text-xs text-text-muted">{c.tests_count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button onClick={() => onManage(null)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong px-2.5 py-2 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand">
          <FolderPlus className="size-3.5" /> Thư mục mới
        </button>
      </div>

      <p className="rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-text-secondary">
        Mỗi lớp có cây thư mục riêng. Đề chưa gán sẽ nằm ở “Chưa phân loại”.
      </p>
    </aside>
  );
}
