"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
  FolderCog,
  HardDrive,
  Image as ImageIcon,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  createDocument,
  deleteDocument,
  getStorageUsage,
  listDocCategories,
  listDocuments,
  publishDocument,
} from "@/lib/api/documents";
import { formatBytes, categoryColor, type Doc, type DocCategory, type DocListMeta, type StorageUsage } from "@/lib/types/document";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CategoryManagerModal } from "@/features/documents/category-manager-modal";
import { StorageModal } from "@/features/documents/storage-modal";
import { CreateContentModal } from "@/features/documents/create-content-modal";
import { cn } from "@/lib/utils";
import { boolParam } from "@/lib/api";

function DocsView() {
  const router = useRouter();
  const params = useSearchParams();
  const type = (params.get("type") ?? "document") as "document" | "lecture";
  const q = params.get("q") ?? "";
  const categoryId = params.get("category") ?? "";
  const published = params.get("published") ?? "";
  const view = params.get("view") === "grid" ? "grid" : "list";
  const page = params.get("page") ?? "";

  const [rows, setRows] = useState<Doc[]>([]);
  const [meta, setMeta] = useState<DocListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(q);
  const [cats, setCats] = useState<DocCategory[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Doc | null>(null);

  const setParam = useCallback((u: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(u)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in u) && !("view" in u)) next.delete("page"); // đổi bộ lọc → về trang 1
    router.replace(`/teacher/documents?${next.toString()}`);
  }, [params, router]);

  const load = useCallback(() => {
    setLoading(true);
    listDocuments({ type, q, category_id: categoryId, is_published: boolParam(published), page })
      .then((r) => { setRows(r.data); setMeta(r.meta); })
      .catch(() => toast.error("Không tải được danh sách."))
      .finally(() => setLoading(false));
  }, [type, q, categoryId, published, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setSearch(q), [q]);
  const loadMeta = useCallback(() => {
    listDocCategories().then((r) => setCats(r.data)).catch(() => {});
    getStorageUsage().then(setStorage).catch(() => {});
  }, []);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  async function create(t: "document" | "lecture") {
    setCreateOpen(false);
    try {
      const { document } = await createDocument({ type: t, title: "Nội dung mới" });
      router.push(`/teacher/documents/${document.id}/edit`);
    } catch { toast.error("Không tạo được nội dung."); }
  }

  async function togglePublish(d: Doc) {
    const next = !d.is_published;
    setRows((p) => p.map((x) => (x.id === d.id ? { ...x, is_published: next } : x)));
    try { await publishDocument(d.id, next); }
    catch { setRows((p) => p.map((x) => (x.id === d.id ? { ...x, is_published: !next } : x))); toast.error("Không đổi được."); }
  }

  async function doDelete(d: Doc) {
    const res = await deleteDocument(d.id);
    setConfirmDel(null);
    toast.success("Đã xoá nội dung.");
    if (res.sessions.length) toast.warning(`Đã gỡ khỏi ${res.sessions.length} buổi đang giao.`);
    load();
  }

  const hasFilter = !!q || !!categoryId || !!published;
  const usedPct = storage ? (storage.total_bytes / storage.limit_bytes) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Tài liệu & Bài giảng</h1>
          <p className="text-sm text-text-secondary">{view === "grid" ? "Xem dạng lưới — nhìn ảnh bìa dễ nhận ra nội dung hơn" : "Tài liệu hiện ở Thư viện học sinh · Bài giảng chỉ đến qua giao bài."}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border-[1.5px] border-border bg-surface-alt p-0.5">
            <button onClick={() => setParam({ view: null })} aria-label="Dạng danh sách" aria-pressed={view === "list"}
              className={cn("flex size-8 items-center justify-center rounded-full transition-colors", view === "list" ? "bg-surface text-brand shadow-sm" : "text-text-muted hover:text-text")}><List className="size-4" /></button>
            <button onClick={() => setParam({ view: "grid" })} aria-label="Dạng lưới" aria-pressed={view === "grid"}
              className={cn("flex size-8 items-center justify-center rounded-full transition-colors", view === "grid" ? "bg-surface text-brand shadow-sm" : "text-text-muted hover:text-text")}><LayoutGrid className="size-4" /></button>
          </div>
          <Button variant="outline" size="sm" iconLeft={<FolderCog className="size-4" />} onClick={() => setCatOpen(true)}>Danh mục</Button>
          <Button iconLeft={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>Tạo nội dung</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-border">
        {([["document", "Tài liệu"], ["lecture", "Bài giảng"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setParam({ type: k === "document" ? null : k })}
            className={cn("relative px-4 py-2.5 text-sm font-semibold transition-colors", type === k ? "text-brand after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand" : "text-text-secondary hover:text-text")}>
            {l}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); const v = e.target.value; setTimeout(() => setParam({ q: v || null }), 0); }} placeholder="Tìm tiêu đề…" className="pl-10" />
        </div>
        <Select value={categoryId} onChange={(e) => setParam({ category: e.target.value || null })}>
          <option value="">Mọi danh mục</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {type === "document" && (
          <Select value={published} onChange={(e) => setParam({ published: e.target.value || null })}>
            <option value="">Thư viện: tất cả</option>
            <option value="1">Đang hiện</option>
            <option value="0">Đang ẩn</option>
          </Select>
        )}
        {hasFilter && <Button variant="ghost" size="sm" onClick={() => setParam({ q: null, category: null, published: null })}>Xoá lọc</Button>}
      </div>

      {/* Nội dung: list hoặc grid */}
      {loading ? (
        view === "grid" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-surface-alt" />)}</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface"><div className="divide-y divide-border">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-surface-alt" />)}</div></div>
        )
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border-[1.5px] border-border bg-surface p-6">
          <EmptyState icon={type === "document" ? <FileText className="size-7" /> : <GraduationCap className="size-7" />}
            title={hasFilter ? "Không có nội dung phù hợp" : `Chưa có ${type === "document" ? "tài liệu" : "bài giảng"} nào`}
            action={<Button size="sm" onClick={() => create(type)}>Tạo {type === "document" ? "tài liệu" : "bài giảng"}</Button>} />
        </div>
      ) : view === "grid" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => {
            const color = categoryColor(d.category?.name);
            return (
              <div key={d.id} role="button" tabIndex={0} onClick={() => router.push(`/teacher/documents/${d.id}/edit`)}
                onKeyDown={(e) => { if (e.key === "Enter") router.push(`/teacher/documents/${d.id}/edit`); }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(58,51,48,0.1)]">
                <div className={cn("relative flex h-28 items-center justify-center overflow-hidden", color.cover)}>
                  {d.thumbnail_url
                    ? <img src={d.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    : d.type === "lecture" ? <GraduationCap className="size-8 text-text/60" /> : <FileText className="size-8 text-text/45" />}
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-text-secondary shadow-sm">
                    {d.view_count ? `${d.view_count} lượt xem` : "— lượt xem"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <p className="line-clamp-2 font-display text-base font-bold text-text">{d.title}</p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    {d.category
                      ? <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", color.chip)}>{d.category.name}</span>
                      : <span className="text-xs text-text-muted">Chưa phân loại</span>}
                    {type === "document" && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <Switch checked={d.is_published} onCheckedChange={() => togglePublish(d)} aria-label="Hiện trong thư viện" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Ảnh</th>
                <th className="px-3 py-3 text-left font-semibold">Tiêu đề</th>
                <th className="hidden px-3 py-3 text-left font-semibold md:table-cell">Danh mục</th>
                <th className="hidden px-3 py-3 text-left font-semibold lg:table-cell">Đính kèm</th>
                <th className="px-3 py-3 text-left font-semibold">Lượt xem</th>
                {type === "document" && <th className="px-3 py-3 text-left font-semibold">Thư viện</th>}
                <th className="px-3 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const color = categoryColor(d.category?.name);
                return (
                  <tr key={d.id} className="border-t border-border hover:bg-surface-alt">
                    <td className="px-3 py-2.5">
                      {d.thumbnail_url ? <img src={d.thumbnail_url} alt="" className="h-9 w-14 rounded-lg object-cover" /> : <span className={cn("flex h-9 w-14 items-center justify-center rounded-lg text-text/50", color.cover)}>{d.type === "lecture" ? <GraduationCap className="size-4" /> : <ImageIcon className="size-4" />}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/teacher/documents/${d.id}/edit`} className="font-semibold text-text hover:text-brand">{d.title}</Link>
                      <p className="text-xs text-text-muted">{d.type === "document" ? "Tài liệu" : "Bài giảng"} · {d.reading_minutes} phút đọc</p>
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">{d.category ? <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", color.chip)}>{d.category.name}</span> : <span className="text-text-muted">—</span>}</td>
                    <td className="hidden px-3 py-2.5 text-text-secondary lg:table-cell">{d.attachments_count ? `${d.attachments_count} file` : "—"}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{d.view_count}</td>
                    {type === "document" && (
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Switch checked={d.is_published} onCheckedChange={() => togglePublish(d)} aria-label="Hiện trong thư viện" />
                          <span className={cn("text-xs", d.is_published ? "font-semibold text-success" : "text-text-muted")}>{d.is_published ? "Hiện" : "Ẩn"}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/teacher/documents/${d.id}/edit`} aria-label="Sửa" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text"><Pencil className="size-4" /></Link>
                        <button onClick={() => setConfirmDel(d)} aria-label="Xoá" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Thanh dung lượng — luôn ghim dưới cùng; bên phải là phân trang */}
      {storage && (
        <div className="sticky bottom-0 z-10 mt-4 bg-bg pb-1 pt-2">
          <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4 shadow-[0_-6px_20px_rgba(58,51,48,0.06)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-text-secondary"><HardDrive className="size-4" /> Dung lượng đã dùng</span>
              <span className="ml-auto text-sm text-text-secondary">{formatBytes(storage.total_bytes)} / {formatBytes(storage.limit_bytes)}</span>
              <Button variant="outline" size="sm" onClick={() => setStoreOpen(true)}>Quản lý dung lượng</Button>
              {meta && meta.total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">
                    Hiển thị {meta.from ?? 1}–{meta.to ?? rows.length} / {meta.total} {type === "document" ? "tài liệu" : "bài giảng"}
                  </span>
                  {meta.last_page > 1 && (
                    <div className="flex items-center gap-1">
                      <button aria-label="Trang trước" disabled={meta.current_page <= 1}
                        onClick={() => setParam({ page: String(meta.current_page - 1) })}
                        className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-border text-text-secondary hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary"><ChevronLeft className="size-4" /></button>
                      <button aria-label="Trang sau" disabled={meta.current_page >= meta.last_page}
                        onClick={() => setParam({ page: String(meta.current_page + 1) })}
                        className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-border text-text-secondary hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary"><ChevronRight className="size-4" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-alt"><div className={cn("h-full rounded-full", usedPct > 90 ? "bg-danger" : "bg-brand")} style={{ width: `${Math.min(100, usedPct)}%` }} /></div>
          </div>
        </div>
      )}

      <CreateContentModal open={createOpen} onClose={() => setCreateOpen(false)} onPick={create} />
      <CategoryManagerModal open={catOpen} onClose={() => setCatOpen(false)} onSaved={() => { loadMeta(); load(); }} />
      <StorageModal open={storeOpen} onClose={() => setStoreOpen(false)} onChanged={loadMeta} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) return doDelete(confirmDel); }} title="Xoá nội dung?" danger confirmLabel="Vẫn xoá" description={confirmDel ? `Xoá "${confirmDel.title}"? Nếu đang được giao trong buổi học, nội dung sẽ bị gỡ khỏi lộ trình (cân nhắc Ẩn khỏi thư viện thay vì xoá).` : null} />
    </div>
  );
}

export default function DocumentsPage() {
  return <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}><DocsView /></Suspense>;
}
