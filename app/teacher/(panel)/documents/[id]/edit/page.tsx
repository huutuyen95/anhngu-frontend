"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, FileText, GraduationCap, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  embedPreview,
  getDocument,
  updateDocument,
  uploadAttachment,
  deleteAttachment,
} from "@/lib/api/documents";
import { uploadImage } from "@/lib/api/media";
import { listClassrooms } from "@/lib/api/classrooms";
import { listDocCategories } from "@/lib/api/documents";
import { formatBytes, type Attachment, type Doc, type DocCategory } from "@/lib/types/document";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { RichEditor } from "@/components/ui/rich-editor";
import { DocPreviewModal } from "@/features/documents/doc-preview-modal";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function Editor({ id }: { id: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"document" | "lecture">("document");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [classIds, setClassIds] = useState<number[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [cats, setCats] = useState<DocCategory[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: number; name: string }[]>([]);
  const [words, setWords] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [exiting, setExiting] = useState(false);
  const [preview, setPreview] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getDocument(id).then((r) => {
      const d = r.document;
      setDoc(d); setTitle(d.title); setBody(d.body ?? ""); setType(d.type);
      setCategoryId(d.category_id); setThumb(d.thumbnail_url); setClassIds(d.classroom_ids ?? []);
      setIsPublished(d.is_published); setAttachments(d.attachments ?? []);
    });
    listDocCategories().then((r) => setCats(r.data)).catch(() => {});
    listClassrooms().then((r) => setClassrooms(r.data.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, [id]);

  const save = useCallback(async (overrides?: Record<string, unknown>): Promise<boolean> => {
    setSaveState("saving");
    try {
      await updateDocument(id, {
        title, body, type, category_id: categoryId, thumbnail_url: thumb,
        classroom_ids: classIds, is_published: type === "lecture" ? false : isPublished,
        ...overrides,
      });
      setSaveState("saved");
      return true;
    } catch { setSaveState("dirty"); toast.error("Không lưu được."); return false; }
  }, [id, title, body, type, categoryId, thumb, classIds, isPublished]);

  // Autosave 5s sau khi ngừng thay đổi.
  function scheduleSave() {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(), 5000);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Nút "Lưu": lưu xong → báo thành công → về danh sách.
  async function saveAndExit() {
    if (timer.current) clearTimeout(timer.current); // huỷ autosave đang chờ
    setExiting(true);
    const ok = await save();
    if (!ok) { setExiting(false); return; }
    toast.success("Đã lưu nội dung thành công.");
    router.push("/teacher/documents");
  }

  async function addAttachment(file: File) {
    try {
      const { attachment } = await uploadAttachment(id, file);
      setAttachments((a) => [...a, attachment]);
      toast.success("Đã tải file.");
    } catch (e) {
      toast.error((e as Error & { code?: string }).code === "quota_exceeded" ? "Hết dung lượng (5GB) — xoá bớt file nặng." : "Tải file thất bại.");
    }
  }
  async function removeAttachment(a: Attachment) {
    await deleteAttachment(a.id);
    setAttachments((x) => x.filter((y) => y.id !== a.id));
  }

  async function onEditorImage(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = ".jpg,.jpeg,.png,.webp";
      input.style.display = "none";
      document.body.appendChild(input); // vài webview chỉ mở picker khi input nằm trong DOM
      const cleanup = () => input.remove();
      input.onchange = async () => {
        const f = input.files?.[0];
        cleanup();
        if (!f) return resolve(null);
        try { const { url } = await uploadImage(f); resolve(url); } catch { toast.error("Tải ảnh thất bại."); resolve(null); }
      };
      input.click();
    });
  }
  async function onEditorVideo(url: string): Promise<boolean> {
    try { const r = await embedPreview(url); return r.recognized; }
    catch { return false; }
  }

  if (!doc) return <div className="mx-auto max-w-6xl p-4"><div className="h-96 animate-pulse rounded-2xl bg-surface-alt" /></div>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/teacher/documents" aria-label="Về danh sách" className="flex size-10 items-center justify-center rounded-2xl border-[1.5px] border-border bg-surface text-text-secondary hover:text-brand"><ArrowLeft className="size-5" /></Link>
        <span className="text-sm text-text-muted" aria-live="polite">{saveState === "saved" ? "Đã lưu" : saveState === "saving" ? "Đang lưu…" : "Chưa lưu"}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" iconLeft={<Eye className="size-4" />} onClick={() => setPreview(true)}>Xem trước</Button>
          <Button size="sm" onClick={saveAndExit} loading={exiting}>Lưu</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Cột soạn */}
        <div>
          <input value={title} onChange={(e) => { setTitle(e.target.value); scheduleSave(); }} placeholder="Tiêu đề nội dung…"
            className="mb-3 w-full border-b-[1.5px] border-border bg-transparent pb-2 font-display text-xl font-bold text-text outline-none focus:border-brand" />
          <RichEditor value={body} onChange={(html) => { setBody(html); scheduleSave(); }} onWordCount={setWords} onImageUpload={onEditorImage} onEmbedVideo={onEditorVideo} />
          <p className="mt-2 text-xs text-text-muted">{words} từ · khoảng {Math.max(1, Math.ceil(words / 200))} phút đọc</p>
        </div>

        {/* Panel phải */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <p className="mb-2 text-xs font-bold uppercase text-text-muted">Loại nội dung</p>
            <div className="flex gap-2">
              {([["document", "Tài liệu", FileText], ["lecture", "Bài giảng", GraduationCap]] as const).map(([k, l, Icon]) => (
                <button key={k} onClick={() => { setType(k); scheduleSave(); }} className={cn("flex flex-1 flex-col items-center gap-1 rounded-xl border-[1.5px] p-3 text-sm font-semibold transition-colors", type === k ? "border-brand bg-brand-soft text-brand" : "border-border text-text-secondary hover:bg-surface-alt")}>
                  <Icon className="size-5" /> {l}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <label className="text-xs font-bold uppercase text-text-muted">Danh mục</label>
            <Select block wrapClassName="mt-1" value={categoryId ?? ""} onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : null); scheduleSave(); }}>
              <option value="">— Chưa chọn —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <ImageUpload label="Ảnh bìa" value={thumb} onChange={(u) => { setThumb(u); scheduleSave(); }} upload={uploadImage} />
          </div>

          {classrooms.length > 0 && (
            <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
              <p className="mb-2 text-xs font-bold uppercase text-text-muted">Gắn cho lớp</p>
              <div className="flex flex-wrap gap-2">
                {classrooms.map((c) => <Checkbox key={c.id} checked={classIds.includes(c.id)} onCheckedChange={() => { setClassIds((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])); scheduleSave(); }} label={c.name} />)}
              </div>
            </div>
          )}

          <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <p className="mb-2 text-xs font-bold uppercase text-text-muted">File đính kèm</p>
            <input ref={attachRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && addAttachment(e.target.files[0])} />
            <div className="flex flex-col gap-2">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-text">{a.name}</span>
                  <span className="text-xs text-text-muted">{formatBytes(a.size_bytes)}</span>
                  <button onClick={() => removeAttachment(a)} aria-label="Xoá file" className="text-text-muted hover:text-danger"><Trash2 className="size-4" /></button>
                </div>
              ))}
              <Button variant="outline" size="sm" iconLeft={<Upload className="size-4" />} onClick={() => attachRef.current?.click()}>Thêm file</Button>
            </div>
          </div>

          <div className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            {type === "lecture" ? (
              <p className="text-xs text-text-muted">Bài giảng không có công tắc thư viện — chỉ đến học sinh qua giao bài.</p>
            ) : (
              <label className="flex items-center gap-2">
                <Switch checked={isPublished} onCheckedChange={(v) => { setIsPublished(v); save({ is_published: v }); }} aria-label="Hiện trong thư viện" />
                <span className="text-sm font-medium text-text">Hiện trong thư viện</span>
              </label>
            )}
          </div>
        </div>
      </div>

      <DocPreviewModal open={preview} onClose={() => setPreview(false)} title={title} body={body}
        type={type} readingMinutes={Math.max(1, Math.ceil(words / 200))} author={user?.name} attachments={attachments} />
    </div>
  );
}

export default function DocumentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Editor id={Number(id)} />;
}
