# CLAUDE.md — anhngu-frontend

FE Next.js (App Router, TypeScript, Tailwind v4) cho website học tiếng Anh (dùng nội bộ,
giáo viên + học sinh). Gọi API của `anhngu-backend` (Laravel, submodule `backend/` cùng repo cha).
Repo này là submodule `frontend/` của `anhngu-infra`.

## Stack

- **Next 16** (App Router), **React 19**, **TypeScript**, **Tailwind v4**.
- UI primitives: **@base-ui/react** (không phải Radix) + `shadcn` CLI để sinh component vào
  `components/ui/*`. Toast: **sonner**. Rich text: **tiptap**. Kéo-thả: **@dnd-kit**.
- Chạy trong **Docker**. `docker-compose.yml` nằm ở repo cha (`anhngu-infra`).

## ⚠️ Chạy lệnh — BẮT BUỘC qua Docker

Máy dev KHÔNG cài Node trực tiếp. MỌI lệnh phải chạy trong container.

Chạy Claude Code NGAY trong thư mục frontend này, gọi lệnh docker với `-f ../docker-compose.yml`:

```bash
docker compose -f ../docker-compose.yml exec frontend npm run dev
docker compose -f ../docker-compose.yml exec frontend npm run build
docker compose -f ../docker-compose.yml exec frontend npm run lint
docker compose -f ../docker-compose.yml exec frontend npm install <pkg>
```

(Nếu chạy Claude Code tại thư mục infra thì bỏ `-f ../docker-compose.yml`.)

Sau mỗi lần `git pull`/merge làm đổi `package.json`, phải `npm install` lại trong container
**trước khi** build/dev, nếu không sẽ lỗi thiếu module.

## Kiến trúc

- `app/` — route mỏng (page/layout gọi vào `features/`, không chứa logic nghiệp vụ nặng).
  - `app/(app)/*` — khu học viên: `tests`, `library/vocab`, `library/documents`, `missions`.
  - `app/teacher/(panel)/*` — khu giáo viên/admin: `classes`, `students`, `tests`, `vocabulary`,
    `documents`, `results`, `reports`.
  - `app/login`, `app/teacher/login`, `app/forgot-password`, `app/reset-password` — auth, ngoài
    2 khu trên (route group riêng, không có panel/nav).
- `features/<domain>/*` — logic + component theo domain (`tests`, `classes`, `students`,
  `documents`, `vocabulary`, `grading`...). Đây là nơi chứa phần lớn code, không phải `app/`.
- `lib/api/*` — 1 file/domain (`tests.ts`, `classrooms.ts`, `students.ts`, `media.ts`,
  `attempts.ts`, `attendance.ts`, `dashboard.ts`, `decks.ts`, `dictionary.ts`, `documents.ts`,
  `reports.ts`), gọi qua helper của `lib/api.ts`. `lib/auth.tsx` là context auth (token, user).
- `lib/types/*` — type khớp response backend (`test.ts`, `classroom.ts`, `student.ts`, `deck.ts`,
  `document.ts`, `user.ts`, `attempt.ts`).
- `components/ui/*` — component dùng lại (button, card, dialog, badge, tabs, select, upload...).
  Dùng lại thay vì tự chế card/badge/dialog mới.
- `components/student/student-shell.tsx` — khung + điều hướng khu học sinh (xem mục Design).
- Lọc/tìm kiếm/phân trang trên list page lưu vào **URL query** (`useSearchParams`/`useRouter`),
  không lưu vào state cục bộ — để share link và back/forward hoạt động đúng.
- `'use client'` cho component có tương tác (form, dnd, tiptap...); giữ page/layout ở `app/`
  server component khi có thể.

## `lib/api.ts` — helper gọi API

- `api<T>(path, options)` — JSON request, tự gắn `Content-Type` + `Authorization: Bearer <token>`,
  ném `ApiError` (có `status`, `errors` field-level từ Laravel) khi response lỗi.
- `apiForm<T>(path, form, options)` — multipart (upload), không set `Content-Type` để browser tự
  gắn boundary.
- `getToken()` / `setToken()` — đọc/ghi token trong `localStorage`.
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (fallback `http://localhost:8000/api/v1`).
- 401 giữa phiên (đã có token) → tự xoá token + phát event `auth:expired` (nghe ở `lib/auth.tsx`).

## Design — 2 hệ, KHÔNG dark mode

Token khai ở `app/globals.css` (`@theme`). Có **hai** bảng màu, tách theo khu:

### Khu quản trị (`app/teacher/**`) — pillow UI cam/kem

- Font: **Baloo 2** (`--font-display`, tiêu đề) + **Quicksand** (`--font-sans`, body).
- Màu: brand cam `#F2793B` (bold `#D65F27`, soft `#FDEBDD`), nền kem `#FBF7EA`, surface trắng.
  Có token skill đề (`--color-skill-reading/listening/writing/speaking`).
- Nguồn chuẩn: `backend/docs/DESIGN-UI-CHI-TIET.md`.

### Khu học sinh (`app/login`, `app/forgot-password`, `app/(app)/**`) — Organic

- DS ở **`public/ds/organic.css`** (link trong `app/layout.tsx`), **scope dưới class `.organic`**.
  File `_ds/organic/styles.css` gốc không có trong repo — DS được dựng lại từ token trong prompt
  "Đổi giao diện khu Học sinh sang Organic".
- Cơ chế: trong `.organic`, các biến chung (`--color-bg/surface/text/brand/border`…) được **remap**
  sang bảng organic → mọi màn học sinh dùng utility (`bg-bg`, `text-brand`, `bg-surface`…) **tự đổi
  palette**, không phải viết lại. Bọc `.organic` ở `student-shell.tsx`, `app/login`, `app/forgot-password`.
- Ramp organic khai trong `@theme` (globals.css) để sinh utility Tailwind: `--color-accent-100..900`
  (terracotta `#c67139`), `--color-accent-2-*` (sage `#7a8a5e`), `--color-neutral-100..900`,
  `--color-divider` → dùng `bg-accent-200`, `text-accent-800`, `border-divider`, `bg-neutral-100`…
- Font: **Figtree** (`--font-figtree`, body; subset `latin-ext` — next/font không có "vietnamese"
  cho Figtree) + **Baloo 2** (heading, đủ dấu tiếng Việt — KHÔNG dùng Caprasimo/Quicksand).
- Component DS dùng lại: `.btn`(+`-primary/-secondary/-ghost/-icon/-block`) · `.tag`(+ biến thể)
  · `.seg`/`.seg-opt` (bộ chọn 1-trong-N, có `:has(input:checked)`) · `.field`/`.input`
  · `.card`(+`-kicker/-title/-body/-meta`) · `.elev-sm/md/lg` · `.washed`. Nút/input bo 999px.

### Điều hướng khu học sinh

- Render qua **`components/student/student-shell.tsx`** — **menu ngang trên header** (76px, 4 mục:
  Nhiệm vụ /missions · Lớp của em /classes · Thư viện /library · Báo cáo /reports), + ô tìm ⌘K,
  chuông, avatar; mobile <768px là **bottom nav 66px** (tự ẩn khi bàn phím mở). KHÔNG còn sidebar.
- `components/layout/app-sidebar/header/footer.tsx` đã **bị xoá** (không dùng nữa).
- `/classes` và `/reports` chưa có page → nav để "Sắp có" (disabled), tránh 404.

## Đề thi phía FE (`features/tests/*`, khu giáo viên)

- `QuestionType` (`lib/types/test.ts`): `multiple_choice | fill_blank | select | writing |
  speaking`. `speaking` đang ẩn sau flag, để dành giai đoạn sau.
- **TUYỆT ĐỐI không render đáp án đúng** (`is_correct`) cho học viên khi đang làm bài — field
  này chỉ xuất hiện (và chỉ nên hiển thị) ở trang kết quả sau khi nộp
  (`app/(app)/tests/[id]/result/[attemptId]`).
- Quản lý đề theo **thư mục** (`test-folder-tree.tsx`, danh mục = `TestCategory`) + các modal
  tạo/sửa/xoá/di chuyển (`create-test-modal`, `test-action-menu`, `test-folder-modal`,
  `move-test-modal`, `delete-test-modal`, `preflight-modal`).
- **Editor A4b** (`test-editor.tsx`): 2 cột, kéo-thả Part/Section/Question bằng **@dnd-kit**
  (`sortable.tsx`, `sortable-question.tsx`).
- **Import Word** (`word-import-wizard.tsx` + `word-guide-drawer.tsx`): tải template, upload
  `.docx` → dry_run xem trước → commit; map về **cùng data model** với tạo tay, chỉ khác cách
  hiển thị. Parser ở backend (`WordTestParser`, phpoffice/phpword).
- Mọi `<select>` dùng chung **`components/ui/select.tsx`** (pill, đã propagate ra các page khác) —
  sửa giao diện dropdown ở 1 chỗ.

## Quản lý học sinh (`features/students/*`)

- `student-detail-modal`, `assign-class-modal`, `student-form-modal` (check email khi blur +
  dirty-guard), `import-wizard` (radio `on_duplicate`, tải file dòng lỗi, kéo-thả). List page
  `app/teacher/(panel)/students/page.tsx`: sort theo cột, click hàng mở chi tiết, bulk đổi lớp,
  banner đã xoá, empty-state 2 CTA.

## Upload media

- `lib/api/media.ts`: `uploadMedia(file, "image" | "audio")` và `uploadImage(file)` — cùng gọi
  `/media/upload`, trả `{ url }`.
- Component: `ImageUpload` (1 ảnh, có preview), `ImageGridUpload` (nhiều ảnh dạng lưới, dùng
  trong `features/tests/question-editor.tsx`), `AudioUpload`.

## Bẫy hay gặp

- **Infinite re-render**: `useEffect` có dependency không ổn định (object/array/function tạo mới
  mỗi render, ví dụ object filter hay callback không nhớ) → loop gọi API vô hạn. Giữ deps ổn định
  (nguyên trị số, hoặc bọc `useMemo`/`useCallback`) trước khi thêm vào mảng deps.

## Git

- Conventional Commits (`feat:`/`fix:`/`docs:`...), nhánh `feature/...` → PR → `main`.
- KHÔNG commit `.env`, `node_modules`.
- Repo này là **submodule** — commit code ở CHÍNH repo `anhngu-frontend`, sau đó mới bump con trỏ
  submodule ở repo cha `anhngu-infra`.

## Tài liệu tham khảo

- `docs/DESIGN-SYSTEM.md`, `docs/DESIGN-GUIDE.md`, `docs/UI-WIREFRAMES.md` — design chi tiết.
- `docs/skills/anhngu-frontend-ui-ux/SKILL.md` — skill UI/UX + kiến trúc (App Router, features,
  API layer). Xem `docs/skills/SKILLS.md` để biết cách bật skill trên máy (Cursor).
