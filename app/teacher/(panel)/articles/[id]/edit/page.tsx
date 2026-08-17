"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpenText, Save } from "lucide-react";
import { toast } from "sonner";
import { embedPreview } from "@/lib/api/documents";
import { getArticle, listArticleCategories, updateArticle } from "@/lib/api/articles";
import { uploadImage } from "@/lib/api/media";
import type { ArticleCategory } from "@/lib/types/article";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { RichEditor } from "@/components/ui/rich-editor";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function ArticleEditor({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    Promise.all([getArticle(id), listArticleCategories()])
      .then(([articleResponse, categoryResponse]) => {
        const article = articleResponse.article;
        setTitle(article.title);
        setBody(article.body ?? "");
        setExcerpt(article.excerpt ?? "");
        setCategoryId(article.category_id);
        setThumbnailUrl(article.thumbnail_url);
        setPublished(article.is_published);
        setCategories(categoryResponse.data);
      })
      .catch(() => toast.error("Không tải được bài viết."))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    if (!title.trim()) {
      toast.error("Tiêu đề không được để trống.");
      return;
    }
    setSaving(true);
    try {
      await updateArticle(id, {
        title: title.trim(),
        body,
        excerpt: excerpt.trim() || null,
        category_id: categoryId,
        thumbnail_url: thumbnailUrl,
        is_published: published,
      });
      toast.success("Đã lưu bài viết.");
      router.push("/teacher/articles");
    } catch {
      toast.error("Không lưu được bài viết.");
    } finally {
      setSaving(false);
    }
  }

  async function onEditorImage(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".jpg,.jpeg,.png,.webp";
      input.style.display = "none";
      document.body.appendChild(input);
      input.onchange = async () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return resolve(null);
        try {
          const response = await uploadImage(file);
          resolve(response.url);
        } catch {
          toast.error("Tải ảnh thất bại.");
          resolve(null);
        }
      };
      input.click();
    });
  }

  if (loading) return <div className="mx-auto h-96 max-w-6xl animate-pulse rounded-2xl bg-surface-alt" />;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/teacher/articles" aria-label="Về danh sách bài viết" className="flex size-10 items-center justify-center rounded-2xl border-[1.5px] border-border bg-surface text-text-secondary hover:text-brand">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Soạn bài viết</p>
          <h1 className="font-display text-xl font-bold text-text">{title || "Bài viết mới"}</h1>
        </div>
        <Button className="ml-auto" iconLeft={<Save className="size-4" />} onClick={save} loading={saving}>Lưu bài viết</Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Tiêu đề bài viết…"
            className="mb-3 w-full border-b-[1.5px] border-border bg-transparent pb-2 font-display text-2xl font-bold text-text outline-none focus:border-brand"
          />
          <RichEditor
            value={body}
            onChange={setBody}
            onWordCount={setWordCount}
            onImageUpload={onEditorImage}
            onEmbedVideo={async (url) => {
              try { return (await embedPreview(url)).recognized; } catch { return false; }
            }}
          />
          <p className="mt-2 text-xs text-text-muted">{wordCount} từ · khoảng {Math.max(1, Math.ceil(wordCount / 200))} phút đọc</p>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <label className="text-xs font-bold uppercase text-text-muted">Danh mục</label>
            <Select block wrapClassName="mt-1" value={categoryId ?? ""} onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">— Chưa phân loại —</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </section>

          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <ImageUpload label="Ảnh bìa" value={thumbnailUrl} onChange={setThumbnailUrl} upload={uploadImage} />
          </section>

          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <label htmlFor="article-excerpt" className="text-xs font-bold uppercase text-text-muted">Mô tả ngắn</label>
            <textarea
              id="article-excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Để trống để hệ thống tự tạo từ nội dung."
              className="mt-2 w-full resize-none rounded-xl border-[1.5px] border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-brand"
            />
          </section>

          <section className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
            <label className="flex items-center gap-3">
              <Switch checked={published} onCheckedChange={setPublished} aria-label="Xuất bản bài viết" />
              <span>
                <span className="block text-sm font-semibold text-text">Xuất bản cho học sinh</span>
                <span className="block text-xs text-text-muted">Bản nháp chỉ Teacher nhìn thấy.</span>
              </span>
            </label>
          </section>

          <div className="rounded-2xl bg-brand-soft p-4 text-sm text-text-secondary">
            <BookOpenText className="mb-2 size-5 text-brand" />
            Bài viết đã xuất bản sẽ xuất hiện ngay tại Thư viện → Bài viết của Student.
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ArticleEditor id={Number(id)} />;
}
