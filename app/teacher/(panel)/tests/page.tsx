"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, FileUp, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { duplicateTest, listTests, updateTest } from "@/lib/api/tests";
import type { Test, TestListMeta } from "@/lib/types/test";
import { SKILL_LABEL } from "@/lib/types/test";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { SKILL_CHIP, SKILL_SHORT } from "@/features/tests/skill";
import { TestFolderTree } from "@/features/tests/test-folder-tree";
import { CreateTestModal } from "@/features/tests/create-test-modal";
import { TestActionMenu } from "@/features/tests/test-action-menu";
import { DeleteTestModal } from "@/features/tests/delete-test-modal";
import { MoveTestModal } from "@/features/tests/move-test-modal";
import { TestFolderModal } from "@/features/tests/test-folder-modal";
import { PreflightModal } from "@/features/tests/preflight-modal";
import { WordImportWizard } from "@/features/tests/word-import-wizard";
import { cn } from "@/lib/utils";

function TestsView() {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo(() => ({
    q: params.get("q") ?? "",
    skill: params.get("skill") ?? "",
    is_published: params.get("published") ?? "",
    category: params.get("category") ?? "",
    page: params.get("page") ?? "1",
  }), [params]);

  const [rows, setRows] = useState<Test[]>([]);
  const [meta, setMeta] = useState<TestListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(filters.q);
  const [treeKey, setTreeKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Test | null>(null);
  const [deleteFor, setDeleteFor] = useState<Test | null>(null);
  const [moveFor, setMoveFor] = useState<Test | null>(null);
  const [previewFor, setPreviewFor] = useState<Test | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderClass, setFolderClass] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const setParam = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k); else next.set(k, v);
    }
    if (resetPage) next.delete("page");
    router.replace(`/teacher/tests?${next.toString()}`);
  }, [params, router]);

  const load = useCallback(() => {
    setLoading(true);
    listTests({ q: filters.q, skill: filters.skill, is_published: filters.is_published, category_id: filters.category, page: filters.page })
      .then((res) => { setRows(res.data); setMeta(res.meta); })
      .catch(() => toast.error("Không tải được danh sách đề thi."))
      .finally(() => setLoading(false));
  }, [filters.q, filters.skill, filters.is_published, filters.category, filters.page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(filters.q); }, [filters.q]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onSearchChange(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam({ q: v || null }), 350);
  }

  const hasFilters = !!filters.q || !!filters.skill || !!filters.is_published || !!filters.category;

  async function togglePublish(t: Test) {
    const next = !t.is_published;
    setRows((p) => p.map((x) => (x.id === t.id ? { ...x, is_published: next } : x)));
    try { await updateTest(t.id, { is_published: next }); }
    catch { setRows((p) => p.map((x) => (x.id === t.id ? { ...x, is_published: !next } : x))); toast.error("Không đổi được."); }
  }

  async function onMenuAction(key: string, t: Test) {
    setMenuFor(null);
    switch (key) {
      case "preview": setPreviewFor(t); break;
      case "edit": router.push(`/teacher/tests/${t.id}/edit`); break;
      case "assign": toast.message("Giao bài mở ở màn Lớp học › Giao bài."); break;
      case "results": router.push(`/teacher/results?test_id=${t.id}`); break;
      case "duplicate":
        try { const { test } = await duplicateTest(t.id); toast.success("Đã nhân bản đề."); router.push(`/teacher/tests/${test.id}/edit`); }
        catch { toast.error("Không nhân bản được."); }
        break;
      case "move": setMoveFor(t); break;
      case "delete": setDeleteFor(t); break;
    }
  }

  function afterFolderChange() { setTreeKey((k) => k + 1); load(); }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Quản lý đề thi</h1>
          <p className="text-sm text-text-secondary">{meta ? `${meta.total} đề` : "Đang tải…"} · thư mục gắn theo lớp</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" iconLeft={<FileUp className="size-4" />} onClick={() => setImportOpen(true)}>Import Word</Button>
          <Button size="sm" iconLeft={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>Tạo đề thi</Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row">
        <TestFolderTree selected={filters.category} reloadKey={treeKey}
          onSelect={(cat) => setParam({ category: cat })}
          onManage={(cid) => { setFolderClass(cid); setFolderOpen(true); }} />

        <div className="min-w-0 flex-1">
          {/* Thanh lọc */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Tìm theo tên đề…" className="pl-10" />
            </div>
            <Select value={filters.skill} onChange={(e) => setParam({ skill: e.target.value || null })}>
              <option value="">Mọi dạng đề</option>
              {Object.entries(SKILL_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </Select>
            <Select value={filters.is_published} onChange={(e) => setParam({ published: e.target.value || null })}>
              <option value="">Thư viện: tất cả</option>
              <option value="true">Đang hiện</option>
              <option value="false">Nháp / ẩn</option>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={() => router.replace("/teacher/tests")}>Xoá lọc</Button>}
          </div>

          {/* Bảng / trạng thái */}
          <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
            {loading ? (
              <div className="divide-y divide-border">{Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4"><div className="h-4 flex-1 animate-pulse rounded bg-surface-alt" /><div className="h-4 w-20 animate-pulse rounded bg-surface-alt" /><div className="h-4 w-16 animate-pulse rounded bg-surface-alt" /></div>
              ))}</div>
            ) : rows.length === 0 ? (
              <div className="p-6">
                {filters.category ? (
                  <EmptyState icon={<FileText className="size-7" />} title="Thư mục này chưa có đề" description="Tạo đề mới hoặc chuyển đề vào thư mục này." />
                ) : hasFilters ? (
                  <EmptyState icon={<Search className="size-7" />} title="Không tìm thấy đề phù hợp" action={<Button variant="outline" size="sm" onClick={() => router.replace("/teacher/tests")}>Xoá lọc</Button>} />
                ) : (
                  <EmptyState icon={<FileText className="size-7" />} title="Chưa có đề thi nào" description="Soạn thủ công hoặc import từ Word."
                    action={<div className="flex gap-2"><Button size="sm" onClick={() => setCreateOpen(true)}>Tạo thủ công</Button><Button size="sm" variant="outline" iconLeft={<FileUp className="size-4" />} onClick={() => setImportOpen(true)}>Import Word</Button></div>} />
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-[1] bg-surface-alt text-text-secondary">
                  <tr className="h-11">
                    <th className="px-4 text-left font-semibold">Tên đề</th>
                    <th className="hidden px-3 text-left font-semibold md:table-cell">Thư mục</th>
                    <th className="px-3 text-left font-semibold">Dạng đề</th>
                    <th className="hidden px-3 text-left font-semibold sm:table-cell">Số câu</th>
                    <th className="px-3 text-left font-semibold">Thư viện</th>
                    <th className="whitespace-nowrap pl-3 pr-6 text-right font-semibold" style={{ width: 116 }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className="h-[58px] border-t border-border transition-colors hover:bg-surface-alt">
                      <td className="max-w-0 px-4">
                        <button onClick={() => router.push(`/teacher/tests/${t.id}/edit`)} className="block max-w-full truncate text-left font-semibold text-text hover:text-brand">{t.title}</button>
                        <div className="truncate text-xs text-text-muted">{SKILL_SHORT[t.skill]} · {t.duration_minutes} phút</div>
                      </td>
                      <td className="hidden max-w-[140px] px-3 md:table-cell"><span className="truncate text-text-secondary">{t.category_name ?? "—"}</span></td>
                      <td className="px-3"><span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-semibold", SKILL_CHIP[t.skill])}>{SKILL_SHORT[t.skill]}</span></td>
                      <td className="hidden px-3 text-text-secondary sm:table-cell">{t.question_count ?? "—"}</td>
                      <td className="px-3"><Switch checked={t.is_published} onCheckedChange={() => togglePublish(t)} aria-label="Hiện trong thư viện" /></td>
                      <td className="pl-3 pr-6" style={{ width: 116 }}>
                        <div className="flex justify-end">
                          <button onClick={() => setMenuFor(t)} aria-label="Hành động"
                            className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-transparent text-text-muted transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand">
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {meta && meta.last_page > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="mr-auto text-sm text-text-muted">Trang {meta.current_page}/{meta.last_page} · {meta.total} đề</span>
              <Button size="sm" variant="outline" disabled={meta.current_page <= 1} onClick={() => setParam({ page: String(meta.current_page - 1) }, false)}>Trước</Button>
              <Button size="sm" variant="outline" disabled={meta.current_page >= meta.last_page} onClick={() => setParam({ page: String(meta.current_page + 1) }, false)}>Sau</Button>
            </div>
          )}
        </div>
      </div>

      <CreateTestModal open={createOpen} onClose={() => setCreateOpen(false)} categoryId={filters.category ? Number(filters.category) : null} onImport={() => { setCreateOpen(false); setImportOpen(true); }} />
      <WordImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
      <TestActionMenu test={menuFor} open={!!menuFor} onClose={() => setMenuFor(null)} onAction={onMenuAction} />
      <DeleteTestModal test={deleteFor} open={!!deleteFor} onClose={() => setDeleteFor(null)} onDone={() => { setDeleteFor(null); afterFolderChange(); }} />
      <MoveTestModal test={moveFor} open={!!moveFor} onClose={() => setMoveFor(null)} onDone={() => { setMoveFor(null); afterFolderChange(); }} />
      <PreflightModal test={previewFor} open={!!previewFor} onClose={() => setPreviewFor(null)}
        onEdit={(t) => { setPreviewFor(null); router.push(`/teacher/tests/${t.id}/edit`); }}
        onAssign={() => { setPreviewFor(null); toast.message("Giao bài mở ở màn Lớp học › Giao bài."); }} />
      <TestFolderModal open={folderOpen} onClose={() => setFolderOpen(false)} classroomId={folderClass} onSaved={afterFolderChange} />
    </div>
  );
}

export default function TestsPage() {
  return <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}><TestsView /></Suspense>;
}
