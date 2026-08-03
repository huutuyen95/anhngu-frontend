"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BookA,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Copy,
  Eye,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  deleteDeck,
  duplicateDeck,
  listDecks,
  publishDeck,
} from "@/lib/api/decks";
import { listClassrooms } from "@/lib/api/classrooms";
import type { Deck } from "@/lib/types/deck";
import type { ClassroomRef } from "@/lib/types/student";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeckFormModal } from "@/features/vocabulary/deck-form-modal";
import { cn } from "@/lib/utils";

function VocabView() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const classId = params.get("class") ?? "";
  const published = params.get("published") ?? "";

  const [rows, setRows] = useState<Deck[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(q);
  const [classrooms, setClassrooms] = useState<ClassroomRef[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deck | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<Deck | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = useCallback(
    (u: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(u)) v ? next.set(k, v) : next.delete(k);
      router.replace(`/teacher/vocabulary?${next.toString()}`);
    },
    [params, router],
  );

  const load = useCallback(() => {
    setLoading(true);
    listDecks({ q, classroom_id: classId, is_published: published })
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .catch(() => toast.error("Không tải được danh sách bộ từ."))
      .finally(() => setLoading(false));
  }, [q, classId, published]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => { listClassrooms().then((r) => setClassrooms(r.data)).catch(() => {}); }, []);

  function onSearchChange(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam({ q: v || null }), 350);
  }

  const totalCards = useMemo(() => rows.reduce((s, d) => s + (d.cards_count ?? 0), 0), [rows]);
  const hasFilter = !!q || !!classId || !!published;

  async function togglePublish(deck: Deck) {
    const next = !deck.is_published;
    setRows((p) => p.map((d) => (d.id === deck.id ? { ...d, is_published: next } : d)));
    try {
      await publishDeck(deck.id, next);
    } catch {
      setRows((p) => p.map((d) => (d.id === deck.id ? { ...d, is_published: !next } : d)));
      toast.error("Không đổi được trạng thái thư viện.");
    }
  }

  async function doDelete(deck: Deck) {
    try {
      await deleteDeck(deck.id);
      setConfirmDel(null);
      toast.success("Đã xoá bộ từ.");
      load();
    } catch (err) {
      setConfirmDel(null);
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Bộ từ đang được giao — chỉ có thể Ẩn, không xoá được.");
      } else toast.error("Không xoá được bộ từ.");
    }
  }

  async function doDuplicate(deck: Deck) {
    setMenuId(null);
    const { deck: copy } = await duplicateDeck(deck.id);
    toast.success("Đã nhân bản bộ từ.");
    router.push(`/teacher/vocabulary/${copy.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl" onClick={() => setMenuId(null)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Từ vựng</h1>
          <p className="text-sm text-text-secondary">
            {total} bộ từ · {totalCards} thẻ · audio phát tự động bằng Web Speech API
          </p>
        </div>
        <Button iconLeft={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Tạo bộ từ
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Tìm bộ từ…" className="pl-10" />
        </div>
        {classrooms.length > 0 && (
          <Select value={classId} onChange={(e) => setParam({ class: e.target.value || null })}>
            <option value="">Mọi lớp</option>
            {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        <Select value={published} onChange={(e) => setParam({ published: e.target.value || null })}>
          <option value="">Thư viện: tất cả</option>
          <option value="true">Đang hiện</option>
          <option value="false">Đang ẩn</option>
        </Select>
        {hasFilter && <Button variant="ghost" size="sm" onClick={() => router.replace("/teacher/vocabulary")}>Xoá bộ lọc</Button>}
      </div>

      {loading ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface-alt" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5">
          {hasFilter ? (
            <EmptyState icon={<Search className="size-7" />} title="Không tìm thấy bộ từ phù hợp" action={<Button variant="outline" size="sm" onClick={() => router.replace("/teacher/vocabulary")}>Xoá bộ lọc</Button>} />
          ) : (
            <EmptyState icon={<BookA className="size-7" />} title="Chưa có bộ từ nào" description="Tạo bộ từ đầu tiên để bắt đầu." action={<Button size="sm" iconLeft={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>Tạo bộ từ</Button>} />
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => {
            const total = d.cards_count ?? 0;
            const audio = d.audio_ready_count ?? 0;
            const audioFull = total > 0 && audio >= total;
            return (
              <div key={d.id} className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(58,51,48,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><BookA className="size-5" /></span>
                    <div>
                      <Link href={`/teacher/vocabulary/${d.id}`} className="font-display text-base font-bold text-text hover:text-brand">{d.name}</Link>
                      <p className="text-xs text-text-muted">{total} thẻ · {d.owner_name ?? "cô Uyên"}</p>
                    </div>
                  </div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenuId(menuId === d.id ? null : d.id)} aria-label="Menu bộ từ" className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"><MoreVertical className="size-4" /></button>
                    {menuId === d.id && (
                      <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
                        <button onClick={() => { setEditing(d); setFormOpen(true); setMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt"><Pencil className="size-4" /> Sửa</button>
                        <button onClick={() => doDuplicate(d)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt"><Copy className="size-4" /> Nhân bản</button>
                        <Link href={`/teacher/vocabulary/${d.id}?preview=1`} className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt"><Eye className="size-4" /> Xem như học sinh</Link>
                        <button onClick={() => { setMenuId(null); setConfirmDel(d); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> Xoá</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={audioFull ? "success" : "warning"}>{audio}/{total} có audio</StatusBadge>
                  {(d.classrooms ?? []).slice(0, 2).map((c) => <StatusBadge key={c.id} tone="info">{c.name}</StatusBadge>)}
                  {(d.classrooms?.length ?? 0) === 0 && <StatusBadge tone="neutral">Dùng chung</StatusBadge>}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch checked={d.is_published} onCheckedChange={() => togglePublish(d)} aria-label="Hiện trong thư viện" />
                    <span className={d.is_published ? "font-semibold text-success" : "text-text-muted"}>{d.is_published ? "Trong thư viện" : "Đang ẩn"}</span>
                  </label>
                  <Link href={`/teacher/vocabulary/${d.id}`} className="text-sm font-medium text-brand hover:underline">Mở bộ từ →</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeckFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSaved={(deck, isNew) => { if (isNew) router.push(`/teacher/vocabulary/${deck.id}`); else load(); }}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => { if (confirmDel) return doDelete(confirmDel); }}
        title="Xoá bộ từ?"
        danger
        confirmLabel="Xoá bộ từ"
        description={confirmDel ? `Xoá "${confirmDel.name}"? Nếu bộ đang được giao trong buổi học sẽ không xoá được (chỉ Ẩn).` : null}
      />
    </div>
  );
}

export default function VocabularyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Đang tải…</div>}>
      <VocabView />
    </Suspense>
  );
}
