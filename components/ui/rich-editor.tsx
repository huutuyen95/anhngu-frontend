"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Link2, Image as ImageIcon, Video as YoutubeIcon, RemoveFormatting,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onWordCount?: (words: number) => void;
  /** Mở bộ chọn ảnh, trả URL đã upload (hoặc null nếu huỷ). */
  onImageUpload?: () => Promise<string | null>;
  /** Kiểm tra link YouTube hợp lệ trước khi nhúng; trả true nếu OK. */
  onEmbedVideo?: (url: string) => Promise<boolean>;
};

function Btn({ on, active, label, children }: { on: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={on}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand [&_svg]:size-4",
        active && "bg-brand-soft text-brand"
      )}
    >
      {children}
    </button>
  );
}

export function RichEditor({ value, onChange, onWordCount, onImageUpload, onEmbedVideo }: Props) {
  const [dialog, setDialog] = useState<null | "link" | "video">(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      onWordCount?.(editor.state.doc.textContent.trim().split(/\s+/).filter(Boolean).length);
    },
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[320px] w-full rounded-b-xl border-x-[1.5px] border-b-[1.5px] border-border bg-surface px-4 py-3 text-[15px] leading-relaxed text-text outline-none",
      },
    },
  });

  // Đồng bộ khi value đổi từ ngoài (nạp bản nháp).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="h-96 animate-pulse rounded-xl bg-surface-alt" />;

  function openLink() {
    setErr(null);
    setUrl(editor!.getAttributes("link").href ?? "");
    setDialog("link");
  }
  function openVideo() {
    setErr(null);
    setUrl("");
    setDialog("video");
  }
  async function addImage() {
    if (!onImageUpload) return;
    const u = await onImageUpload();
    if (u) editor!.chain().focus().setImage({ src: u }).run();
  }

  async function submit() {
    const u = url.trim();
    if (dialog === "link") {
      if (u) editor!.chain().focus().extendMarkRange("link").setLink({ href: u }).run();
      else editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      setDialog(null);
      return;
    }
    // video
    if (!u) { setErr("Nhập link YouTube."); return; }
    setBusy(true);
    const ok = onEmbedVideo ? await onEmbedVideo(u) : true;
    setBusy(false);
    if (!ok) { setErr("Link YouTube không hợp lệ."); return; }
    editor!.commands.setYoutubeVideo({ src: u });
    setDialog(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-[1.5px] border-border bg-surface-alt p-1">
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Đậm"><Bold /></Btn>
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Nghiêng"><Italic /></Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} label="Tiêu đề 1"><Heading1 /></Btn>
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Tiêu đề 2"><Heading2 /></Btn>
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Danh sách"><List /></Btn>
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Danh sách số"><ListOrdered /></Btn>
        <Btn on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Trích dẫn"><Quote /></Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn on={openLink} active={editor.isActive("link")} label="Chèn link"><Link2 /></Btn>
        <Btn on={addImage} label="Chèn ảnh"><ImageIcon /></Btn>
        <Btn on={openVideo} label="Nhúng video"><YoutubeIcon /></Btn>
        <Btn on={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} label="Xoá định dạng"><RemoveFormatting /></Btn>
      </div>
      <EditorContent editor={editor} />

      <Modal open={dialog !== null} onClose={() => setDialog(null)}
        title={dialog === "video" ? "Nhúng video YouTube" : "Chèn link"}
        footer={<>
          <Button variant="outline" onClick={() => setDialog(null)}>Huỷ</Button>
          <Button onClick={submit} loading={busy}>{dialog === "video" ? "Nhúng" : "Áp dụng"}</Button>
        </>}>
        <Input autoFocus value={url} onChange={(e) => { setUrl(e.target.value); setErr(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={dialog === "video" ? "https://youtube.com/watch?v=…" : "https://…"} />
        {dialog === "link" && <p className="mt-2 text-xs text-text-muted">Để trống rồi Áp dụng để bỏ link.</p>}
        {err && <p className="mt-2 text-sm font-medium text-danger">{err}</p>}
      </Modal>
    </div>
  );
}
