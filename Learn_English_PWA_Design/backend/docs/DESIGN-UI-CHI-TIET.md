# DESIGN UI CHI TIẾT — Website học tiếng Anh (Anh ngữ Mrs Uyên)

> **Phạm vi:** đặc tả UI/UX chi tiết cho **14 màn ADMIN** + **12 màn FE học sinh** theo
> `DAC-TA-CHUC-NANG.md` (nguồn sự thật, 2026-07-27), đủ để dev code trực tiếp.
> **Ngày:** 2026-07-28.
>
> **Đọc kèm:** `DAC-TA-CHUC-NANG.md` (chức năng chốt) · `PHAN-TICH-DE-THI.md` (engine 4 loại câu)
> · `DESIGN-DATABASE.md` (data model) · `DESIGN-ADMIN-HOC-VIEN.md` (IA/brand) ·
> `frontend/docs/DESIGN-SYSTEM.md` + `frontend/docs/UI-WIREFRAMES.md` (token & wireframe FE hiện có)
> · `frontend/docs/skills/anhngu-frontend-ui-ux/SKILL.md` (kiến trúc FE).
>
> **Quy ước đọc:** 🆕 = component/màn làm mới · ♻️ = tái dùng cái đã có trong `frontend/`
> · ⚠️ = bị ảnh hưởng bởi 8 thay đổi mới của cô giáo · ❓ = cần chốt trước khi code.

---

## Mục lục

- [0. Mâu thuẫn giữa các doc — cần chốt trước khi code](#0-mâu-thuẫn-giữa-các-doc--cần-chốt-trước-khi-code)
- [1. Hiện trạng FE — cái gì tái dùng, cái gì làm mới](#1-hiện-trạng-fe--cái-gì-tái-dùng-cái-gì-làm-mới)
- [2. Design System chung](#2-design-system-chung)
  - [2.1. Màu](#21-màu)
  - [2.2. Typography](#22-typography)
  - [2.3. Spacing · radius · shadow](#23-spacing--radius--shadow)
  - [2.4. "Sinh động hơn" — quy tắc & giới hạn](#24-sinh-động-hơn--quy-tắc--giới-hạn)
  - [2.5. Bộ component dùng chung](#25-bộ-component-dùng-chung)
  - [2.6. Trạng thái chuẩn (loading/empty/error/success/permission)](#26-trạng-thái-chuẩn)
- [3. Phân hệ ADMIN — 14 màn](#3-phân-hệ-admin--14-màn)
- [4. Phân hệ FE học sinh — 12 màn](#4-phân-hệ-fe-học-sinh--12-màn)
- [5. Ưu tiên & bàn giao](#5-ưu-tiên--bàn-giao)
- [6. Câu hỏi cần cô/khách chốt](#6-câu-hỏi-cần-côkhách-chốt)

---

## 0. Mâu thuẫn giữa các doc — cần chốt trước khi code

Bốn điểm dưới đây **lệch nhau giữa các file**. Trong tài liệu này ta đi theo cột "Tạm áp dụng"
(ưu tiên `DAC-TA-CHUC-NANG.md` vì là nguồn sự thật) nhưng **đánh dấu ❓** ở đúng màn liên quan —
cần bạn/cô chốt trước khi viết migration & code.

| # | Mâu thuẫn | Doc A | Doc B | Tạm áp dụng trong doc này |
|---|-----------|-------|-------|---------------------------|
| **C1** | **Palette** | `DESIGN-ADMIN-HOC-VIEN.md` + `DESIGN-SYSTEM.md` §2: navy `#002854` + amber `#F5AC3D` · `mocks/lumen/`: Ocean `#0E4A5C` + Coral `#FF6B4A` | **Option 1 đã chốt với khách** (prototype `Learn English Pages v2.dc.html`): cam `#F2793B` + kem `#FBF7EA`, Baloo 2 + Quicksand | **✅ ĐÃ CHỐT: Option 1.** Hai bộ token cũ (navy/amber, Lumen) **không dùng nữa** — cần cập nhật `frontend/docs/DESIGN-SYSTEM.md` §2 và ghi chú mocks Lumen là lịch sử. Xem [§2.1](#21-màu). |
| **C2** | **Xoá mềm** | `DAC-TA` STT2: *"Xoá = xoá mềm"* | `DESIGN-DATABASE.md` §1: *"**Không** dùng soft delete MVP"* | Theo `DAC-TA`: **soft delete cho `users`** (HV) + màn có filter "Đã xoá" · các bảng khác xoá cứng. Cần thêm `deleted_at` vào `users`. |
| **C3** | **Điểm danh + nhận xét theo buổi** | `DAC-TA` STT10: tab Nhận xét = điểm danh (Đúng giờ/Muộn/Nghỉ) + nhận xét + export | `DESIGN-DATABASE.md` §7: *"CẤM tạo — Attendance / nhận xét buổi"* | Theo `DAC-TA`: cần bảng mới `session_attendances`. Đề xuất schema ở [Admin 10](#admin-10--chi-tiết-lớp--tab-nhận-xét). |
| **C4** | **Chấm AI** | `DAC-TA` đổi #2 + §6.1: mở lại, ChatGPT chấm writing | `DESIGN-DATABASE.md`: `tests.ai_grading` *"giữ cột, luôn false — không code AI"* | UI **thiết kế sẵn chỗ** cho AI (nút "Nhờ AI chấm", panel gợi ý điểm, cô duyệt/sửa) nhưng **feature-flag `AI_GRADING_ENABLED=false`** → ẩn hoàn toàn khi tắt. Không block sprint. |

**Lệch nhỏ khác (đã tự xử lý, không cần chốt):**

- `session_items.itemable_type` hiện chỉ `Test | Deck`, nhưng `DAC-TA` STT9 cho giao **Tài liệu &
  Bài giảng** → cần thêm morph type `Document` (1 bảng, 2 type: `document | lecture`).
- `test_attempts.status` trong DB là `in_progress|submitted|expired`, còn UI STT13 cần 4 trạng thái
  **Đang làm / Tạm dừng / Đã xong / Chờ chấm** → map: `in_progress` (+`paused_at`) · `submitted` ·
  `pending_review` (writing chưa chấm) · `graded`. Đề xuất đổi enum ở [Admin 13](#admin-13--kết-quả-làm-bài).
- `scoring_method` DB ghi `by_correct_count`, `DAC-TA` đổi #7 chốt **`scale_10_even`** → dùng
  `scale_10_even` (điểm/câu = 10 / tổng số câu, hiển thị 1 chữ số thập phân).

---

## 1. Hiện trạng FE — cái gì tái dùng, cái gì làm mới

Khảo sát `frontend/` (Next.js App Router + Tailwind v4, chưa có thư viện UI).

**Đã có (♻️ tái dùng ngay):**

| File | Nội dung | Dùng lại thế nào |
|------|----------|------------------|
| `lib/api.ts` | fetch wrapper + `ApiError` (status + `errors`) + token localStorage | Giữ nguyên. Mọi màn gọi qua đây; **bổ sung** `lib/api/*.ts` theo resource (`students.ts`, `tests.ts`, `attempts.ts`, `classrooms.ts`, `decks.ts`, `documents.ts`, `reports.ts`). |
| `lib/auth.tsx` | context `useAuth()` — `user`, `loading`, `login/logout` | Giữ. **Bổ sung** `user.role` guard cho `(teacher)` group. |
| `app/(app)/layout.tsx` | shell HV: sidebar 4 mục + panel user + logout, guard redirect `/login` | **Refactor**: desktop giữ sidebar, mobile chuyển **bottom nav 4 mục**; thêm header (search + chuông + Báo lỗi) theo FE STT3. |
| `app/login/page.tsx` | form login nối API thật | Giữ logic, **restyle** theo design system; tách riêng `/teacher/login`. |
| `app/(app)/library/page.tsx`, `library/vocab/` | skeleton hub + vocab | Giữ route, dựng lại UI theo FE STT6/9. |
| `app/globals.css` | chỉ có `--background/--foreground` mặc định Next | **Thay** bằng token block ở [§2.1](#21-màu). Xoá `prefers-color-scheme: dark` (doc chốt không dark mode) và `font-family: Arial`. |
| `docs/UI-WIREFRAMES.md` | wireframe 7 màn HV + 5 màn GV | Nền tảng cho doc này; các màn còn lại (writing, listening, nhận xét, báo cáo lớp…) là mới. |

**Chưa có → làm mới (🆕):** toàn bộ `components/ui/*` (Button, Input, Badge, Card, Table, Modal,
Tabs, Toast, EmptyState, FileUpload, AudioPlayer, WordCounter, Countdown, Pagination, Skeleton),
toàn bộ route group `(teacher)/*` (14 màn), và 8/12 màn FE (writing, listening player, flashcard
đầy đủ, viewer tài liệu, tra từ điển, báo cáo cá nhân, hồ sơ, lớp chi tiết).

**Kiến trúc đặt code** (theo `SKILL.md`, không đổi):

```
app/
  login/page.tsx                    ♻️ FE STT1
  (app)/…                           ♻️ shell HV  (FE STT3)
  (teacher)/login/page.tsx          🆕 Admin STT1
  (teacher)/…                       🆕 shell GV  + 13 màn
components/ui/                      🆕 primitive (§2.5)
features/
  students/ classrooms/ tests/ documents/ decks/ grading/ results/ reports/   🆕
  missions/ library/ attempts/ writing/ flashcards/ dictionary/               🆕
lib/api/*.ts                        🆕 1 file / resource
lib/types/*.ts                      🆕 DTO khớp API
```

---

## 2. Design System chung

### 2.1. Màu

**Đã chốt = Option 1** (cam ấm trên nền kem, thân thiện với học sinh — xem prototype
`Learn English Pages v2.dc.html`). Toàn bộ component **chỉ đọc biến semantic**, không hardcode hex.

```css
/* app/globals.css — Design System Option 1 (đã chốt với khách) */
:root {
  /* Brand — cam ấm + kem */
  --color-brand:        #F2793B;   /* primary: nút chính, tab active, số liệu lớn */
  --color-brand-bold:   #D65F27;   /* hover / pressed / bóng đặc của nút */
  --color-brand-soft:   #FDEBDD;   /* nền chip / row active */
  --color-accent:       #FFC94D;   /* CTA phụ, streak, progress, cảnh báo nhẹ */
  --color-accent-soft:  #FFF3D3;

  /* Neutral — nền kem */
  --color-bg:           #FBF7EA;   /* nền trang */
  --color-surface:      #FFFFFF;   /* card, bảng, modal, input */
  --color-surface-alt:  #FDFBF3;   /* header bảng, row hover */
  --color-border:       #EFE7D4;
  --color-border-strong:#E4DCC8;
  --color-text:         #3A3330;
  --color-text-secondary:#8A8073;
  --color-text-muted:   #B5AC9C;

  /* Semantic */
  --color-success:      #7FAB2A;  --color-success-soft: #F1F8DE;
  --color-danger:       #E5604C;  --color-danger-soft:  #FDE7E2;
  --color-warning:      #E3AB2D;  --color-warning-soft: #FFF3D3;
  --color-info:         #56C2EE;  --color-info-soft:    #E4F5FD;

  /* Màu kỹ năng (badge dạng đề — nhất quán 2 phân hệ) */
  --skill-reading:   #7FAB2A;  --skill-reading-soft:   #F1F8DE;
  --skill-listening: #56C2EE;  --skill-listening-soft: #E4F5FD;
  --skill-writing:   #B8860B;  --skill-writing-soft:   #FFF3D3;
  --skill-speaking:  #8C7DE6;  --skill-speaking-soft:  #EFECFC;
}
```

**Quy tắc dùng màu**

- Tối đa **1 màu nền lớn / màn** (`--color-bg`), mọi khối nội dung là `surface` trắng.
- Vàng `--color-accent` **chỉ** cho: CTA phụ, progress, badge "sắp hết hạn", streak. Chữ trên vàng
  phải là `#7A5C10`/`--color-text` (không dùng chữ trắng — contrast fail).
- Nút chính = **pill + bóng đặc** `0 3px 0 var(--color-brand-bold)`, nhấn xuống 2px; card = viền
  1.5px `--color-border` + radius 20px. Không dùng shadow mờ nhiều lớp.
- Màu kỹ năng chỉ xuất hiện ở **badge/chip và icon-tile**, không tô mảng lớn.
- Đúng/Sai bắt buộc **có chữ kèm màu** ("Đúng ✓" / "Sai ✕") — a11y.
- Không gradient tím, không dark mode, không emoji thay icon (icon = Lucide outline 1.5–2px).

### 2.2. Typography

| Vai trò | Token | Giá trị |
|---|---|---|
| Font tiêu đề | `--font-display` | **Baloo 2** — weight 600/700/800, subset `vietnamese`. Dùng cho page title, card title, số liệu lớn (điểm, timer). |
| Font body | `--font-sans` | **Quicksand** — weight 400/500/600/700, subset `vietnamese`. Fallback `system-ui, "Segoe UI", sans-serif`. |
| Page title | `text-2xl/700` | 24–28px · line-height 1.25 |
| Section title | `text-lg/600` | 18–20px |
| Card title | `text-base/600` | 16px |
| Body | `text-sm/500` | 14–16px · line-height 1.55 |
| Label bảng / meta | `text-xs/600` | 12–13px · uppercase, letter-spacing .4px cho header bảng |
| Số liệu lớn (điểm, timer) | `text-3xl/700` → `text-4xl/700` | 30–40px, tabular-nums |
| Nút | `text-sm/600` | 14–16px |

- **Passage đọc hiểu & bài writing:** 16px, line-height **1.85**, max-width **68ch**, `text-wrap: pretty`.
- Cỡ chữ làm bài có 3 mức S/M/L (FE STT7) → nhân hệ số `0.9 / 1 / 1.15` lên biến `--reading-scale`.

### 2.3. Spacing · radius · shadow

- Thang spacing 4px: `4 8 12 16 20 24 32 40 48 64`. Gap lưới card 16–20px; padding card 16 (admin) / 20 (FE).
- Radius: `sm 8` (icon button) · `md 14` (input, ô số câu) · `lg 20` (card) · `xl 26` (modal, shell)
  · `full` (nút, chip, badge, avatar).
- Shadow: mặc định **flat + border 1px**; `hover-card: 0 6px 20px rgba(16,24,40,.08)`;
  `modal: 0 20px 48px rgba(16,24,40,.16)`; **không** shadow màu, không glow, không "pillow" 3D.
- Chiều cao control: input/nút **40px** (admin desktop) · **48px** (FE mobile). Touch ≥ 44×44.
- Row bảng admin: 56px; header bảng 44px, sticky khi cuộn.
- Max width content: admin 1440 (content ~1200) · FE 1 cột mobile, desktop max 1120.

### 2.4. "Sinh động hơn" — quy tắc & giới hạn

Đổi #6 của cô = **vi tương tác + phản hồi tức thì**, KHÔNG phải thêm hoạt hoạ marketing.

**LÀM (whitelist):**

| Chỗ | Hiệu ứng | Ngân sách |
|---|---|---|
| Card / row hover | nâng shadow + dịch `translateY(-1px)` | 150–200ms ease |
| Nút | đổi nền + `active:scale(.98)` | 120ms |
| Chọn đáp án | viền + nền brand-soft **transition màu**, tick fade-in | 150ms |
| Loading | **skeleton** khung đúng hình dạng thật (không spinner toàn trang) | shimmer 1.2s loop |
| Progress (buổi học, flashcard, word count) | thanh chạy `width` có transition | 300ms ease-out |
| Đếm ngược < 5 phút | đổi sang `warning`, nhịp `opacity` 1s (không nhảy layout) | ≤ 1 lần/s |
| Nộp bài xong / hoàn thành deck | **confetti 1 lần, ≤ 1.2s, tắt được** + số điểm count-up 600ms | 1 lần/phiên |
| Flashcard | flip 3D 300ms trục Y | 300ms |
| Chuyển câu / tab | fade + slide 8px | 180ms |
| Toast | slide-in từ trên phải, tự tắt 4s | 200ms |
| Streak / chuỗi ngày | badge amber, icon lửa **SVG** (không emoji) | tĩnh |

**KHÔNG LÀM (blacklist — chống lố):** hero marketing/balloon kiểu UUP, FAB "Luyện nói AI",
mascot, parallax, gradient động, auto-carousel, âm thanh nền, hiệu ứng > 400ms, animation trên
màn đang làm bài (trừ timer + chọn đáp án), bounce/elastic easing, nhiều hơn **1 animation
"ăn mừng"** trong 1 luồng.

**Bắt buộc:** mọi transition bọc `@media (prefers-reduced-motion: reduce)` → chỉ đổi màu/opacity.
Không animation nào chặn tương tác hoặc làm mất focus.

### 2.5. Bộ component dùng chung

Tất cả nằm ở `components/ui/`, không biết business logic. Props chính:

| # | Component | Props / biến thể | Ghi chú |
|---|-----------|------------------|---------|
| 1 | **Button** | `variant: primary \| accent \| outline \| ghost \| danger`, `size: sm \| md \| lg`, `loading`, `iconLeft/iconRight`, `fullWidth`, `as` | `loading` → spinner + disable, giữ nguyên width (không nhảy layout). |
| 2 | **Card** | `padding`, `hoverable`, `header/footer` slot | Border 1px + radius lg. |
| 3 | **DataTable** | `columns[{key,label,width,align,sortable,render}]`, `rows`, `selectable`, `onSelectionChange`, `sort`, `loading`, `empty`, `stickyHeader`, `bulkActions` | Dùng cho 6 grid admin. Loading = 8 row skeleton. Mobile → tự đổi sang **card list** (`renderMobileRow`). |
| 4 | **Pagination** | `page`, `perPage` (20/50/100), `total` | Kèm text "Hiển thị a–b / n". |
| 5 | **Modal** | `size: sm \| md \| lg \| full`, `title`, `footer`, `closeOnOverlay`, `dirtyGuard` | `dirtyGuard` = hỏi lại nếu form đã sửa. Focus trap + Esc. |
| 6 | **Drawer** | `side: right`, `width` | Dùng cho thông báo, chi tiết nhanh. |
| 7 | **Tabs** | `items[{key,label,badge}]`, `value`, `onChange`, `variant: line \| pill` | `role="tablist"`, đồng bộ query param `?tab=`. |
| 8 | **Toast** | `type: success \| error \| warning \| info`, `title`, `desc`, `action` | Provider ở root; auto-dismiss 4s; `aria-live`. |
| 9 | **StatusBadge** | `tone: neutral \| success \| warning \| danger \| info \| brand`, `label`, `dot` | Map trạng thái ở [§2.6](#26-trạng-thái-chuẩn). Luôn có text. |
| 10 | **SkillBadge** | `skill: reading \| listening \| writing \| speaking \| mixed` | Chữ + icon, dùng biến `--skill-*`. |
| 11 | **EmptyState** | `illustration`, `title`, `desc`, `primaryAction`, `secondaryAction` | Minh hoạ **SVG line-art đơn sắc brand**, ≤ 160px. 1 CTA chính. |
| 12 | **FormField** | `label` (bắt buộc, không dùng placeholder thay label), `required`, `hint`, `error`, `children` | Error đỏ ngay dưới field + `aria-describedby`. |
| 13 | **Input / Textarea / Select / Checkbox / Switch / DatePicker** | chuẩn hoá h40/48, focus ring brand 2px | Switch = On/Off cho cờ "Hiện trong thư viện", `is_active`. |
| 14 | **FileUpload** | `accept`, `maxSize`, `multiple`, `hint`, `value`, `onUpload(progress)`, `variant: dropzone \| inline` | Dùng cho: ảnh lớp, audio đề, ảnh thẻ từ, file tài liệu, **Excel/Word import**. Hiện % + huỷ + lỗi từng file. |
| 15 | **AudioPlayer** ⚠️ | `src`, `maxPlays?`, `allowSeek`, `showRemaining`, `onPlayCountChange`, `size: sm \| lg` | Đổi #1. Chế độ thi: `allowSeek=false`, đếm "còn n lần nghe", hết lượt → disable + text. |
| 16 | **WordCounter** ⚠️ | `value`, `limit=150`, `warnAt=0.9` | Đổi #3. `n/150 từ`; ≥135 → warning; >150 → danger + chặn nộp (hoặc cảnh báo, ❓Q4). |
| 17 | **Countdown** | `endsAt` (server), `warnBelow=300s`, `onExpire` | Nguồn = server (`started_at + duration`), client chỉ hiển thị; `aria-live="polite"`; resync mỗi 30s. |
| 18 | **ProgressBar / ProgressRing** | `value`, `max`, `tone`, `showLabel` | Ring cho điểm tổng, bar cho tiến độ. |
| 19 | **Skeleton** | `variant: text \| row \| card \| table` | Mọi màn phải có, không spinner toàn trang. |
| 20 | **FilterBar** | `search`, `filters[]`, `onReset`, `resultCount` | Chuẩn hoá 6 grid admin; giữ state ở URL query. |
| 21 | **ConfirmDialog** | `tone: danger \| default`, `title`, `desc`, `confirmLabel`, `requireText?` | Xoá hàng loạt → yêu cầu gõ số lượng (`requireText`). |
| 22 | **StatCard** | `label`, `value`, `delta`, `trend[]` (sparkline), `icon`, `tone` | Dashboard admin + báo cáo FE. |
| 23 | **RichTextEditor** | `value`, `onChange`, `toolbar: basic` (bold/italic/underline/list/link/ảnh/nhúng video) | Tài liệu & bài giảng. Giữ được gạch chân/in đậm từ import Word. |
| 24 | **QuestionRenderer** ⚠️ | `question`, `mode: take \| review \| edit`, `value`, `onChange` | 4 loại câu: `multiple_choice`, `fill_blank`, `select`, `upload`. Dùng ở FE STT7 + Admin STT4/14 → **1 nguồn sự thật**. |
| 25 | **DictionaryPopover** | `enabled`, `anchorRange` | FE STT11, tắt mặc định trong lúc thi. |

### 2.6. Trạng thái chuẩn

**Map trạng thái → StatusBadge** (dùng y hệt ở mọi màn):

| Domain | Giá trị | tone | Label VI |
|---|---|---|---|
| HV | `is_active=true/false` | success / neutral | Đang hoạt động / Đã khoá |
| Mission | `todo` / `in_progress` / `done` | neutral / warning / success | Chưa làm / Đang làm / Hoàn thành |
| Attempt | `in_progress` / `paused` / `submitted` / `pending_review` / `graded` | info / warning / success / **warning** / success | Đang làm / Tạm dừng / Đã xong / **Chờ chấm** / Đã chấm |
| Đề | `is_published` | success / neutral | Hiện trong thư viện / Ẩn |
| Lớp | suy từ `starts_on/ends_on` | success / neutral / info | Đang diễn ra / Đã kết thúc / Chưa bắt đầu |
| Điểm danh | `on_time` / `late` / `absent` | success / warning / danger | Đúng giờ / Muộn / Nghỉ |
| Câu trả lời | đúng / sai / chưa chấm | success / danger / neutral | Đúng / Sai / Chờ chấm |

**5 trạng thái màn hình — bắt buộc thiết kế đủ cho MỌI màn:**

1. **Loading** — skeleton đúng hình dạng (bảng: 8 row; card: 4 khung; form: field mờ). Không spinner toàn trang, không nhảy layout.
2. **Rỗng** — `EmptyState` 1 CTA. Phân biệt *chưa có dữ liệu* ("Chưa có học sinh — Thêm học sinh đầu tiên") vs *lọc không ra* ("Không khớp bộ lọc — Xoá bộ lọc").
3. **Lỗi** — lỗi tải: banner đỏ nhạt trong khối + nút "Thử lại"; lỗi form: message dưới field (từ `ApiError.errors`); lỗi 500/mạng: toast + giữ nguyên dữ liệu đã nhập (không mất bài).
4. **Thành công** — toast ngắn (`"Đã lưu"`, `"Đã giao bài cho 28 học sinh"`); hành động nặng (import, chấm) → panel kết quả có số liệu.
5. **Phân quyền** — `student` vào `/teacher/*` → 403 page "Khu vực dành cho giáo viên" + nút về Nhiệm vụ. Nút không được phép: **ẩn** (không disable im lặng). API vẫn authorize (không tin UI).

---

## 3. Phân hệ ADMIN — 14 màn

**Shell chung (desktop-first, ≥1024px)** — 1 lần, các màn sau không nhắc lại:

```
┌────────────┬──────────────────────────────────────────────────────────┐
│ Logo       │ Breadcrumb / tên màn        [🔔]  [Cô Uyên ▾]            │  h=60
│────────────│──────────────────────────────────────────────────────────│
│ Tổng quan  │                                                          │
│ Học sinh   │   Page header: H1 + mô tả .......... [nút phụ] [CTA]     │
│ Lớp học    │   FilterBar ............................................ │
│ Đề thi     │   ┌──────────────────────────────────────────────────┐   │
│ Từ vựng    │   │  Nội dung chính (bảng / form / grid card)        │   │
│ Tài liệu   │   └──────────────────────────────────────────────────┘   │
│ Bài giảng  │   Pagination                                             │
│ Kết quả  ⑨ │                                                          │
│ Báo cáo    │                                                          │
│────────────│                                                          │
│ [avatar]   │                                                          │
└────────────┴──────────────────────────────────────────────────────────┘
   240px                              flex-1, padding 24–32
```

- Sidebar 240px, `surface` trắng, item active = nền `--color-brand-soft` + chữ brand + thanh 3px
  bên trái; badge số cho "Kết quả" (số bài chờ chấm). Thu gọn 64px (chỉ icon) < 1280px.
- Mọi grid admin: FilterBar giữ state ở URL (`?q=&class=&status=&page=`) để F5/share không mất lọc.
- Responsive admin: **1024+ đầy đủ** · 768–1023 sidebar overlay + bảng cuộn ngang (giữ cột đầu
  sticky) · <768 chỉ hỗ trợ **xem** (bảng → card list), tác vụ nặng (soạn đề, chấm bài) hiện
  banner "Vui lòng dùng máy tính để soạn đề/chấm bài".

---

### Admin 1 — Đăng nhập (Admin)

**Mục đích / user:** cô giáo (`teacher|admin`) vào khu quản trị. Route `/teacher/login`, tách hẳn FE.

**Bố cục** (split 2 cột, ≥1024; mobile chỉ còn card):

```
┌───────────────────────────┬──────────────────────────────┐
│  [Logo] Anh ngữ Mrs Uyên  │                              │
│                           │   ┌────────────────────────┐ │
│  "Khu vực quản trị"       │   │ Đăng nhập quản trị     │ │
│  1 dòng mô tả             │   │ Email       [........] │ │
│                           │   │ Mật khẩu    [......👁] │ │
│  (nền brand navy,         │   │ ☐ Ghi nhớ đăng nhập    │ │
│   pattern line-art nhạt)  │   │ [    Đăng nhập     ]   │ │
│                           │   │ Quên MK? Liên hệ dev   │ │
│                           │   └────────────────────────┘ │
└───────────────────────────┴──────────────────────────────┘
```

**Component:** 🆕 `AuthLayout`, ♻️ logic `app/login/page.tsx`, `FormField`, `Input`, `Button(primary,fullWidth)`, `Switch/Checkbox`.

**Trạng thái:** loading → nút `loading` + disable form · lỗi 401 → banner đỏ nhạt trong card
"Email hoặc mật khẩu không đúng" (không nói rõ sai cái nào) · 422 → lỗi dưới field ·
`is_active=false` → "Tài khoản đã bị khoá" · **429** sau 5 lần sai → "Thử lại sau 60 giây" +
disable nút có countdown · role `student` đăng nhập đúng → redirect `/missions` kèm toast
"Tài khoản học sinh — đã chuyển về khu học tập".

**Tương tác:** Enter submit · thành công → `/teacher` (hoặc `?next=`). **Không** có "Quên mật khẩu"
(theo `DAC-TA` STT1) — thay bằng dòng text liên hệ dev.

**Dữ liệu:** `POST /api/v1/auth/login {email,password}` → `{token, user{id,name,role,avatar_url}}`.
Guard: role ∉ `teacher|admin` → 403.

**Responsive:** <1024 ẩn cột brand, card full-width max 400px, padding 24.

**Edge:** đã có token hợp lệ → vào `/teacher/login` tự redirect `/teacher`; token hết hạn giữa
phiên → interceptor `ApiError 401` → về login + toast "Phiên đăng nhập đã hết".

---

### Admin 2 — Quản lý học sinh ❓C2

**Mục đích / user:** cô quản lý tài khoản HV toàn trung tâm: tìm, thêm đơn lẻ, import Excel,
khoá/mở, xoá mềm, xoá hàng loạt.

**Bố cục:**

```
Học sinh                        [Tải Excel mẫu] [Import Excel] [+ Thêm học sinh]
86 học sinh · 5 lớp
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔍 Tìm tên / email / SĐT   [Lớp ▾] [Trạng thái ▾] [Đã xoá ▾]  Xoá lọc   │
└──────────────────────────────────────────────────────────────────────────┘
▸ Đã chọn 3  →  [Khoá] [Mở] [Đổi lớp] [Xoá]            (bulk bar, hiện khi chọn)
┌─┬────┬──────────────────┬────────────┬───────────┬──────────┬───────────┐
│☐│STT │ HỌ TÊN (avatar)  │ LỚP        │ GHI CHÚ   │ TRẠNG    │ HÀNH ĐỘNG │
├─┼────┼──────────────────┼────────────┼───────────┼──────────┼───────────┤
│☐│ 1  │ ● Nguyễn Minh Anh│ 6A1, 7B2   │ Học phí…  │ [●On ]   │ 👁 ✎ 🗑    │
│ │    │   minhanh@…      │            │           │          │           │
└─┴────┴──────────────────┴────────────┴───────────┴──────────┴───────────┘
Hiển thị 1–20 / 86                                        [1][2][3][›]
```

**Component:** `DataTable(selectable)`, `FilterBar`, `Switch` (enable/disable inline), `StatusBadge`,
`ConfirmDialog(requireText khi ≥2 dòng)`, `Modal` form HV, 🆕 `ImportExcelModal` (3 bước), `EmptyState`, `Pagination`.

**Modal thêm/sửa HV:** Họ tên* · Email* (unique, khoá khi sửa) · SĐT · Mật khẩu tạm (nút "Sinh
mật khẩu") · Lớp (multi-select) · Ghi chú (textarea) · Trạng thái. Sau khi tạo → toast + panel
"Mật khẩu tạm: xxx" có nút Copy (chỉ hiện 1 lần).

**Modal Import Excel** (3 bước, ⚠️ liên quan đổi #5 về template):
1. *Tải file* — dropzone `.xlsx`, link "Tải Excel mẫu", ghi rõ cột bắt buộc.
2. *Xem trước & lỗi* — bảng preview có cột "Trạng thái dòng": ✓ hợp lệ · ⚠ email trùng (bỏ qua/ghi đè) · ✕ lỗi (thiếu cột/sai định dạng) + lý do từng dòng; nút "Tải file lỗi" (chỉ các dòng ✕).
3. *Kết quả* — "Đã thêm 24 · Bỏ qua 3 · Lỗi 2" + link xem danh sách.

**Trạng thái:** loading 8 row skeleton · rỗng (2 biến thể: chưa có / lọc không khớp) · lỗi tải →
banner + Thử lại · thành công → toast · phân quyền: chỉ `teacher|admin`.

**Tương tác & luồng:** hàng → `/teacher/students/[id]` (hồ sơ + lịch sử làm bài) · ✎ → modal ·
🗑 → confirm "Xoá mềm, có thể phục hồi trong 30 ngày" · Switch đổi ngay + toast có **Hoàn tác 5s**
· "Đã xoá ▾" → Phục hồi. Liên kết: Admin 12 ("Chọn có sẵn") dùng chung endpoint.

**Dữ liệu:** `GET /students?q&classroom_id&is_active&trashed&page` → `{data[{id,name,email,phone,note,is_active,classrooms[],created_at}],meta}`
· `POST/PUT/DELETE /students/{id}` · `PATCH /students/{id}/status` · `POST /students/bulk`
(`{action:'lock'|'unlock'|'delete'|'assign_class', ids[], classroom_id?}`) · `POST /students/import`
(multipart) → `{created,skipped,errors[{row,field,message}]}` · `GET /students/import-template`.
**Field cần bổ sung:** `users.phone`, `users.note`, `users.deleted_at` (❓C2).

**Responsive:** <1280 ẩn cột Ghi chú · <768 card list (tên + email + lớp + badge + menu ⋯).

**Edge:** email trùng khi tạo → lỗi tại field · xoá HV đang có bài dở → cảnh báo "HV có 2 bài đang
làm, dữ liệu vẫn giữ" · HV thuộc nhiều lớp → cột Lớp hiện 2 chip + "+n" · đang lọc mà đổi trạng
thái → không tự loại hàng khỏi bảng (chỉ đổi badge) để tránh nhảy dữ liệu.

---

### Admin 3 — Tạo / sửa lớp học

**Mục đích / user:** cô tạo lớp mới hoặc sửa thông tin lớp. **Dạng Modal** (mở từ Admin 8) —
không cần route riêng, nhưng có `/teacher/classes/new` để deep-link.

**Bố cục (Modal md):**

```
┌ Tạo lớp học ───────────────────────────────── ✕ ┐
│ Tên lớp *            [.............................] │
│ Ảnh đại diện                                        │
│   ┌────┬────┬────┬────┐  ← kho ảnh seed (chọn 1)   │
│   │ 🖼 │ 🖼 │ 🖼 │ 🖼 │     [⬆ Tải ảnh lên]        │
│   └────┴────┴────┴────┘                             │
│ Ngày bắt đầu [12/08/2026]  Ngày kết thúc [ ... ]    │
│ Mô tả (tuỳ chọn) [......................]           │
│─────────────────────────────────────────────────────│
│                                   [Huỷ]  [Lưu lớp]  │
└─────────────────────────────────────────────────────┘
```

**Component:** `Modal(md, dirtyGuard)`, `FormField`, `Input`, `DatePicker` ×2, 🆕 `ImagePicker`
(grid ảnh seed + tab "Tải lên" dùng `FileUpload`), `Textarea`, `Button`.

**Trạng thái:** loading (sửa) → skeleton field · submit → nút loading, form disable · lỗi 422 →
dưới field · thành công → đóng modal + toast "Đã tạo lớp 6A3" + hàng mới highlight 2s trong grid.

**Tương tác:** Lưu → `POST/PUT` → refresh grid; "Lưu & thêm học viên" (nút phụ) → chuyển sang
Admin 12 của lớp vừa tạo. Đóng khi form đã sửa → confirm "Bỏ thay đổi?".

**Dữ liệu:** `POST /classrooms {name,cover_url,starts_on,ends_on,description}` ·
`GET /media/class-covers` (kho ảnh seed) · `POST /media/upload`. Mã lớp/`slug` **server tự sinh**.
Validate: `name` required unique-ish (cảnh báo nếu trùng, không chặn), `ends_on >= starts_on`.

**Responsive:** modal full-screen < 768; kho ảnh 4 cột → 3 cột.

**Edge:** ảnh > 2MB hoặc sai định dạng → lỗi ngay trong dropzone · để trống ngày → lớp
"Chưa bắt đầu"/không giới hạn (cho phép) · sửa `ends_on` về quá khứ → cảnh báo "Lớp sẽ chuyển
sang Đã kết thúc, học sinh vẫn xem lại được".

---

### Admin 4 — Quản lý đề thi ⚠️ (đổi #1, #3, #4, #5, #7, #8)

**Mục đích / user:** màn **cô dùng nhiều nhất**. 1 grid CRUD cho cả 3 dạng đề (Trắc nghiệm /
Nghe / Writing) + quản lý thư mục (category) **theo lớp** + import Word.

**Bố cục (2 cột: cây thư mục 260px + grid):**

```
Đề thi                            [⬇ Tải Word mẫu] [Import Word ▾] [+ Tạo đề thi ▾]
┌─ THƯ MỤC ─────────┐ ┌──────────────────────────────────────────────────────────┐
│ 🔍 tìm thư mục    │ │ 🔍 Tên đề  [Dạng ▾][Thư mục ▾][Thư viện ▾]     Xoá lọc  │
│ ▸ Tất cả đề (42)  │ ├─┬──────────────────────┬────────┬─────┬────┬─────┬──────┤
│ ▾ Lớp 6A1 (12)    │ │☐│ TÊN ĐỀ               │ THƯ MỤC│ DẠNG│ CÂU│ T.VIỆN│ ⋯   │
│    · KT 15 phút(5)│ ├─┼──────────────────────┼────────┼─────┼────┼─────┼──────┤
│    · Giữa kỳ (4)  │ │☐│ Unit 5 — Mini Test   │ 6A1/GK │ 🎧 N│ 20 │ [On]│👁✎🗑 │
│    · Unit 5   (3) │ │ │ 45 phút · sửa 2 ngày │        │     │    │     │      │
│ ▾ Lớp 7B2 (18)    │ │☐│ Writing — Holiday    │ 8C1/W  │ ✍ W │  1 │ [Off]│👁✎🗑│
│ ▸ Chưa phân (12)  │ │ │ ≤150 từ · 30 phút    │        │     │    │     │      │
│ [+ Thư mục mới]   │ └─┴──────────────────────┴────────┴─────┴────┴─────┴──────┘
└───────────────────┘  ▸ Đã chọn 3 → [Đổi thư mục] [Bật/Tắt thư viện] [Xoá]
```

**Component:** 🆕 `CategoryTree` (2 cấp: Lớp → thư mục, kéo-thả đổi thư mục, badge số đề),
`DataTable(selectable)`, `FilterBar`, `SkillBadge`, `Switch` (Hiện trong thư viện), `Modal`,
🆕 `ImportWordWizard`, `ConfirmDialog`, `EmptyState`.

**Nút Tạo (dropdown 4 lựa chọn):** Trắc nghiệm · **Nghe** ⚠️ · Writing ⚠️ · **Import từ Word**.

**Import Word wizard (⚠️ đổi #5 — ưu tiên cao):**
1. *Chọn file + thư mục đích* — dropzone `.docx`, chọn Lớp/Thư mục, link **"Tải Word mẫu"** và
   **"Xem hướng dẫn định dạng"** (drawer: cú pháp `Part → Section → Question`, `A./B./C./D.`,
   `==fill`, `==essay`, `==DA`, `==LG`, cách đặt **passage đọc hiểu** và **đánh dấu audio** cho từng câu).
2. *Preview + lỗi từng dòng* — cột trái cây Part/Section/Question parse được, cột phải cảnh báo:
   số câu ≠ số `==DA`, thiếu `==LG`, câu không có đáp án đúng, ký tự lạ. Giữ **gạch chân/in đậm**.
   Cho **sửa nhanh tại preview** (inline edit) trước khi lưu.
3. *Gắn audio (chỉ đề Nghe)* ⚠️ — bảng "Section/câu → file audio", dropzone nhiều file, tự khớp
   theo tên (`part1.mp3` → Part 1), cấu hình **số lần nghe tối đa** cho mỗi section.
4. *Lưu* — kết quả "Đã tạo đề 20 câu · 3 cảnh báo" + link mở editor.

**Trạng thái:** loading (tree + table skeleton song song) · rỗng: chưa có đề → EmptyState 2 CTA
("Tạo thủ công" / "Import Word"); thư mục rỗng → "Thư mục này chưa có đề" · lỗi parse Word →
panel đỏ liệt kê dòng lỗi, **không lưu gì cả** · thành công → toast.

**Tương tác & luồng:** 👁 → xem trước đề như HV thấy (modal full) · ✎ → editor đề
(`/teacher/tests/[id]/edit`) · 🗑 → confirm (kèm cảnh báo "đề đã có 24 bài làm — xoá sẽ mất kết
quả", nếu có attempt thì **chỉ cho Ẩn**, không cho xoá) · Switch thư viện → toast + Hoàn tác ·
"Giao bài" (menu ⋯) → mở modal Giao bài của Admin 9 với đề đã chọn.

**Dữ liệu:** `GET /tests?q&skill&category_id&is_published&page` ·
`GET /test-categories?classroom_id` (cây) · `POST /test-categories {name,classroom_id,parent_id}`
· `POST /tests`, `PUT /tests/{id}`, `PATCH /tests/{id}/publish`, `DELETE /tests/{id}` ·
`POST /tests/import-word` (multipart) → `{preview,errors[]}` rồi `POST /tests/import-word/commit` ·
`GET /tests/word-template`.
**Field cần bổ sung:** `tests.category_id` + bảng `test_categories(id,name,classroom_id,parent_id)`
(❓C5 — theo đổi #4); `tests.word_limit` (writing, default 150); `tests.rubric` (text, cho AI);
`tests.scoring_method='scale_10_even'`; `test_sections.max_plays` (số lần nghe) ⚠️;
`questions.audio_url` (đã có trong design DB).

**Responsive:** <1280 cây thư mục → dropdown "Thư mục" trong FilterBar · <768 chỉ đọc + banner
"Soạn đề trên máy tính".

**Edge:** đề Writing luôn `is_published=false` mặc định và Switch có tooltip "Đề writing thường
không hiện trong thư viện" · xoá thư mục còn đề → hỏi "Chuyển 5 đề về Chưa phân loại?" · trùng tên
đề trong cùng thư mục → cảnh báo, không chặn · import file > 10MB / không phải .docx → lỗi ngay.

---

### Admin 4b — Editor đề thi (màn con của STT4) ⚠️

> Không nằm trong 14 màn của sheet nhưng **bắt buộc có** để STT4 dùng được. Ghi ở đây để dev không thiếu.

```
← Unit 5 — Mini Test          Nháp · tự lưu 15:02      [Xem trước] [Lưu & giao bài]
┌─ CẤU TRÚC ────┐ ┌──────────────────────────────────────────────────────────────┐
│ ▾ Part 1 🎧    │ │ [🎧 LISTENING]  Part 1 — Listen and choose                   │
│   S1 (audio)  │ │ ┌ Audio của section ──────────────────────────────────────┐  │
│    Q1 MCQ     │ │ │ ▶ unit5-part1.mp3  02:14   Số lần nghe [2 ▾] [Thay file]│  │
│    Q2 fill    │ │ └────────────────────────────────────────────────────────┘  │
│ ▾ Part 2 📖    │ │ ⠿ Câu 1 · Trắc nghiệm · 0.5đ            [Nhân bản] [Xoá]   │
│   S1 passage  │ │   [Where is the boy going after school?              ]      │
│    Q3…Q8      │ │   ◉ A To the library (đáp án đúng)   ○ B To the park       │
│ [+ Part]      │ │   Lời giải: [.....................................]        │
└───────────────┘ │ [+ Thêm câu ▾]                                              │
                  └──────────────────────────────────────────────────────────────┘
```

- **Component:** 🆕 `TestStructureTree` (kéo-thả đổi thứ tự), `QuestionEditor` (dùng chung
  `QuestionRenderer` mode `edit`), `AudioPlayer`, `RichTextEditor` (passage), `FileUpload`.
- 4 loại câu đúng `PHAN-TICH-DE-THI` §1; `upload` (writing/speaking) chỉ hiện khi đề dạng Writing.
- Header đề: dạng · thời gian · **thang điểm "10, chia đều — 0.5đ/câu"** (readonly, tự tính, đổi #7)
  · `word_limit` (writing) · `rubric` (writing, textarea, ⚠️ để AI chấm) · cờ thư viện.
- Autosave 5s + badge "Đã lưu"; rời trang khi chưa lưu → confirm.
- Edge: đề đã có bài làm → banner "Đề đang được dùng, sửa sẽ không đổi bài đã nộp" + khoá xoá câu.

---

### Admin 5 — Quản lý bộ từ vựng

**Mục đích / user:** cô CRUD bộ từ (deck) + thẻ từ, import Excel hàng loạt, bật/tắt hiện thư viện.

**Bố cục — 2 tầng:** (a) grid bộ từ; (b) `/teacher/decks/[id]` bảng thẻ từ.

```
(a) Bộ từ vựng                        [⬇ Excel mẫu] [Import Excel] [+ Tạo bộ từ]
┌─┬────┬────────────────────┬──────┬────────────┬────────┬──────────┐
│☐│STT │ TÊN BỘ             │ SỐ TỪ│ NGÀY TẠO   │ HIỆN   │ HÀNH ĐỘNG│
│☐│ 1  │ GRADE 10 UNIT 5    │  32  │ 12/07/2026 │ [On]   │ 👁 ✎ 🗑   │
└─┴────┴────────────────────┴──────┴────────────┴────────┴──────────┘

(b) ← GRADE 10 UNIT 5 · 32 từ            [Import Excel] [+ Thêm từ]
┌─┬──────────┬────────────┬────────────┬───────┬──────┬───────────────┬────┐
│☐│ TỪ       │ NGHĨA      │ IPA        │ AUDIO │ ẢNH  │ VÍ DỤ         │ ⋯  │
│☐│ souvenir │ quà lưu niệm│/ˈsuːvəniər/│ ▶ 🔊  │ 🖼   │ I bought a…   │ ✎🗑│
│ │          │            │            │[TTS]  │      │               │    │
└─┴──────────┴────────────┴────────────┴───────┴──────┴───────────────┴────┘
```

**Component:** `DataTable`, `Switch`, `FileUpload` (audio/ảnh/Excel), `AudioPlayer(sm)`,
🆕 `InlineEditRow` (sửa nhanh trong bảng), 🆕 `TtsButton` (sinh audio nếu chưa upload), `Modal`, `EmptyState`.

**Trạng thái:** loading skeleton · rỗng "Chưa có bộ từ" · import: preview lỗi từng dòng (thiếu
`term`/`meaning`, trùng từ trong bộ) · audio đang upload → progress trong ô · TTS lỗi → giữ ô trống + toast.

**Tương tác:** 👁 → xem như HV (flashcard preview) · ✎ inline hoặc modal · xoá thẻ → confirm nhẹ
(không cần gõ) · Switch → toast · kéo-thả đổi `order` thẻ.

**Dữ liệu:** `GET/POST/PUT/DELETE /decks`, `/decks/{id}/cards` · `POST /decks/{id}/import` →
`{created,errors[]}` · `POST /cards/{id}/tts` → `{audio_url}` · `PATCH /decks/{id}/publish`.
Bảng `decks`/`cards` đã có đủ field (`term,meaning,ipa,audio_url,image_url,example`).
**Bổ sung:** `decks.classroom_id` null (nếu muốn scope theo lớp — ❓ cùng C5).

**Responsive:** <1024 ẩn cột Ví dụ/Ảnh, mở drawer chi tiết thẻ.

**Edge:** bộ đang được giao trong buổi → cảnh báo khi xoá · 1 thẻ thiếu audio & IPA vẫn cho lưu
(không bắt buộc) nhưng grid hiện icon ⚠ "thiếu audio" để cô bổ sung.

---

### Admin 6 & 7 — Quản lý tài liệu / bài giảng (1 module, 2 type)

**Mục đích / user:** cô CRUD nội dung đọc: **Tài liệu** (hiện trong Thư viện FE nếu bật) và
**Bài giảng** (chỉ đến HV qua giao bài). Dùng **chung module**, khác `type` + khác tab.

**Bố cục:**

```
Nội dung đọc          [Tabs: Tài liệu | Bài giảng]        [+ Tạo tài liệu]
🔍 Tìm tiêu đề   [Danh mục ▾]  [Hiện/Ẩn ▾]
┌────────┬──────────────────────┬──────────┬────────────┬──────┬──────────┐
│ THUMB  │ TIÊU ĐỀ              │ DANH MỤC │ NGÀY TẠO   │ HIỆN │ HÀNH ĐỘNG│
│  🖼    │ Ngữ pháp thì QĐ       │ Grammar  │ 10/07/2026 │ [On] │ ✎ 🗑     │
│        │ 2 file · 1 video      │          │            │      │          │
└────────┴──────────────────────┴──────────┴────────────┴──────┴──────────┘
Dung lượng đã dùng: 1.2 GB / 5 GB  [thanh progress]
```

**Editor (route `/teacher/documents/[id]/edit`):** Tiêu đề* · Danh mục · Thumbnail ·
`RichTextEditor` (văn bản + ảnh + nhúng YouTube) · khu **File đính kèm** (`FileUpload` multiple:
pdf/docx/mp3/mp4 + hiện dung lượng từng file) · Switch "Hiện trong thư viện" (chỉ tab Tài liệu) ·
[Xem trước] [Lưu].

**Component:** `Tabs`, `DataTable`, `RichTextEditor`, `FileUpload`, `Switch`, `ProgressBar` (quota), `EmptyState`.

**Trạng thái:** upload file lớn → progress + cho huỷ · vượt quota → chặn + toast "Còn 300MB, hãy
xoá file cũ" · lỗi nhúng video (link sai) → cảnh báo dưới field · autosave nháp editor.

**Tương tác:** tab Bài giảng **không** có Switch thư viện (thay bằng text "Chỉ đến HV qua giao bài")
· Xem trước → mở đúng viewer HV (FE STT10) trong modal.

**Dữ liệu:** `GET /documents?type=document|lecture&q&category_id&is_published` ·
`POST/PUT/DELETE /documents/{id}` · `POST /documents/{id}/attachments` · `GET /storage/quota`.
**Bảng mới cần thêm:** `documents(id,type,title,slug,category_id,thumbnail_url,body,is_published,
created_by,timestamps)` + `document_attachments(document_id,name,url,size,mime)` +
`document_categories`. Đồng thời cho phép `session_items.itemable_type = Document`.

**Responsive:** editor <1024 → toolbar rút gọn, khu file xuống dưới; <768 chỉ đọc.

**Edge:** xoá tài liệu đang được giao → cảnh báo số buổi đang dùng · file trùng tên → tự hậu tố ·
tài liệu tắt On/Off vẫn xem được nếu đã được giao (theo quy tắc 1 Thư viện: On/Off chỉ ảnh hưởng thư viện).

---

### Admin 8 — Các lớp học (danh sách)

**Mục đích / user:** cô xem toàn bộ lớp, vào chi tiết, tạo lớp.

**Bố cục — grid card 2 cột (desktop 3 cột ≥1440):**

```
Lớp học                        🔍 Tìm tên lớp            [+ Thêm lớp]
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ [ảnh bìa 16:9]          ⋯    │  │ [ảnh bìa]               ⋯    │
│ Lớp 6A1        ● Đang diễn ra│  │ Lớp 7B2      ● Đang diễn ra  │
│ 28 học viên · 3 bài đang mở  │  │ 22 học viên · 4 bài đang mở  │
│ 12/08/2026 → 30/11/2026      │  │ …                            │
│ [Vào lớp]                    │  │ [Vào lớp]                    │
└──────────────────────────────┘  └──────────────────────────────┘
```

**Component:** 🆕 `ClassCard`, `FilterBar(search)`, `StatusBadge`, menu ⋯ (`Xem / Sửa / Xoá`),
`Modal` (Admin 3), `EmptyState`, `Skeleton(card)`.

**Trạng thái:** loading 4 card skeleton · rỗng "Chưa có lớp — Tạo lớp đầu tiên" · xoá lớp còn HV →
confirm `requireText` "Xoá lớp 6A1 và 28 liên kết học viên? (tài khoản HV vẫn giữ)".

**Tương tác:** card/[Vào lớp] → `/teacher/classes/[id]?tab=assign` (mặc định tab Giao bài) ·
Sửa → modal Admin 3 · hover card → nâng shadow.

**Dữ liệu:** `GET /classrooms?q` → `{data[{id,name,cover_url,students_count,open_missions_count,
starts_on,ends_on,status}]}`. `status` server tính từ ngày.

**Responsive:** 1 cột <768; ảnh bìa giữ 16:9.

**Edge:** lớp không có ảnh → placeholder chữ cái đầu trên nền brand-soft · lớp đã kết thúc → card
xám nhẹ + badge "Đã kết thúc", vẫn vào xem được.

---

### Admin 9 — Chi tiết lớp → tab Giao bài ⚠️ (đổi #4)

**Mục đích / user:** trung tâm nghiệp vụ — cô tạo **buổi học (tiến trình)** và **giao nội dung**
vào buổi kèm hạn hoàn thành.

**Bố cục (3 vùng):**

```
← Lớp 6A1 · 28 học viên            [Giao bài] [Nhận xét] [Báo cáo] [Học viên]
┌─ TIẾN TRÌNH HỌC ──┐ ┌────────────────────────────────────────────────────┐
│ [+ Thêm buổi]     │ │ Buổi 3 — Present Simple           [✎ Sửa buổi]     │
│ ▸ Buổi 1  ✓ 28/28 │ │ ┌ Ghi chú cho học sinh ─────────────────────────┐  │
│ ▸ Buổi 2  ✓ 26/28 │ │ │ [RichText nhẹ] Các em xem bài giảng trước…    │  │
│ ● Buổi 3  12/28   │ │ └──────────────────────────────────────────────┘  │
│ ▸ Buổi 4  chưa    │ │ Đã giao (4)                        [+ Giao bài]    │
│   ⠿ kéo đổi thứ tự│ │ ┌────────────────────────────────────────────────┐ │
│                   │ │ │🎧 Listening 03  hạn 22/07 · 9/28 nộp  ⋯        │ │
│                   │ │ │✍ Writing Holiday hạn 24/07 · 18/28 · 6 chờ chấm│ │
│                   │ │ │📚 Deck Unit 5   hạn 25/07 · TB 12/32 từ  ⋯     │ │
│                   │ │ │📄 Bài giảng QĐ   không hạn · 20/28 đã xem  ⋯   │ │
│                   │ │ └────────────────────────────────────────────────┘ │
└───────────────────┘ └────────────────────────────────────────────────────┘
```

**Modal Giao bài (lg, 2 cột):**

```
┌ Giao bài vào buổi ────────────────────────────────────────────── ✕ ┐
│ CHỌN NỘI DUNG                        │ CẤU HÌNH GIAO               │
│ [Đề thi][Writing][Từ vựng][Tài liệu] │ Lớp:  Lớp 6A1 (cố định)     │
│ [Thư mục ▾ (của lớp này) ⚠️] 🔍      │ Buổi *: [Buổi 3 ▾]          │
│ ┌──────────────────────────────────┐ │ Đối tượng: ◉ Cả lớp (28)    │
│ │ ☑ Unit 5 — Mini Test  20 câu     │ │            ○ Chọn HV (0)    │
│ │ ☐ KT 15 phút số 2     10 câu     │ │ Hạn hoàn thành: [24/07]     │
│ │ ☐ Listening 03        15 câu     │ │ Số lần làm: [1 ▾]           │
│ └──────────────────────────────────┘ │ Lịch giao:                  │
│ Đã chọn: 2 nội dung                  │  ◉ Giao ngay ○ Lên lịch     │
│                                      │  ○ Lưu nháp                 │
│                                      │ ☑ Gửi thông báo cho HV      │
│──────────────────────────────────────┴─────────────────────────────│
│                                        [Huỷ]  [Giao cho 28 HV]     │
└────────────────────────────────────────────────────────────────────┘
```

**Component:** 🆕 `SessionRail` (list buổi + progress + kéo-thả), 🆕 `AssignedItemRow`,
🆕 `AssignModal` (2 cột, filter loại + **thư mục theo lớp** ⚠️), `RichTextEditor(nhẹ)`, `DatePicker`,
`Radio`, `Modal`, `ConfirmDialog`, `Toast`, `Tabs`.

**Trạng thái:** loading (rail skeleton + khu chính skeleton) · **lớp chưa có buổi** → EmptyState
"Tạo buổi đầu tiên để giao bài" · buổi chưa giao gì → "Chưa giao nội dung nào" + CTA ·
giao đang xử lý → nút loading, sau đó toast "Đã giao 2 nội dung cho 28 học sinh · 28 thông báo đã gửi"
· giao trùng → cảnh báo "3 HV đã được giao đề này, bỏ qua hay giao lại?".

**Tương tác & luồng:** chọn buổi (rail) → khu chính đổi (không reload) · [+ Giao bài] → modal ·
⋯ trên item đã giao: *Đổi hạn · Gỡ khỏi buổi · Xem kết quả (→ Admin 13 đã lọc) · Nhắc HV chưa làm* ·
"6 chờ chấm" → link Admin 14. Ghi chú buổi autosave (blur) + toast nhẹ.

**Dữ liệu:** `GET /classrooms/{id}/sessions` · `POST/PUT/DELETE /classrooms/{id}/sessions` (+`order`,`note`)
· `GET /session-items?session_id` (kèm `stats{assigned,submitted,pending_review,avg_progress}`)
· `POST /assignments` `{classroom_id,class_session_id,items[{type,id}],student_ids[]|all,due_date,
attempts_allowed,schedule:'now'|'at'|'draft',scheduled_at?,notify:bool}` → tạo N `missions` ·
`DELETE /session-items/{id}` · `POST /assignments/{id}/remind`.
**Field cần bổ sung:** `missions.attempts_allowed`, `missions.scheduled_at`,
`missions.status` thêm `draft|scheduled`; `session_items` thêm morph `Document`.

**Responsive:** <1280 rail thu thành dropdown "Buổi 3 ▾"; modal giao bài 2 cột → 1 cột (chọn nội
dung trước, "Tiếp tục" → cấu hình). <768 chỉ xem.

**Edge:** "Lên lịch" ở quá khứ → chặn · giao Writing → tự nhắc "Đề writing sẽ vào hàng Chờ chấm" ·
giao cho HV đã bị khoá → loại khỏi danh sách + ghi rõ số bị loại · deadline < hôm nay → cảnh báo ·
xoá buổi còn nội dung đã giao → confirm nêu số mission bị ảnh hưởng.

---

### Admin 10 — Chi tiết lớp → tab Nhận xét ❓C3

**Mục đích / user:** cô điểm danh + viết nhận xét **theo từng buổi**, xuất file gửi phụ huynh.

**Bố cục:**

```
← Lớp 6A1               [Giao bài] [Nhận xét] [Báo cáo] [Học viên]
┌─ BUỔI ────────┐ ┌──────────────────────────────────────────────────────────┐
│ ● Buổi 3      │ │ Buổi 3 — 20/07  🔍 Tìm HV   [Điểm danh tất cả: Đúng giờ] │
│ ▸ Buổi 2      │ │                                    [⬇ Tải nhận xét ▾]    │
│ ▸ Buổi 1      │ │ ┌───────────────────┬──────────────────┬───────────────┐ │
│               │ │ │ HỌC VIÊN          │ ĐIỂM DANH        │ NHẬN XÉT      │ │
│               │ │ │ ● Nguyễn Minh Anh │ (◉Đúng giờ ○Muộn │ [textarea…]   │ │
│               │ │ │                   │  ○Nghỉ)          │ 120/500       │ │
│               │ │ │ ● Trần Bảo Châu   │ (○ ◉ ○)          │ [textarea…]   │ │
│               │ │ └───────────────────┴──────────────────┴───────────────┘ │
│               │ │ Đã lưu tự động 15:42 · 26/28 đã điểm danh                │
└───────────────┘ └──────────────────────────────────────────────────────────┘
```

**Component:** `SessionRail` (dùng lại Admin 9), 🆕 `AttendanceRow` (radio 3 lựa chọn, màu semantic),
`Textarea` (autosave, đếm ký tự), 🆕 `ExportMenu` (Excel / PDF ❓Q3), `FilterBar(search)`, `Toast`.

**Trạng thái:** loading skeleton rows · rỗng "Lớp chưa có buổi" / "Buổi này chưa có học viên" ·
autosave: badge "Đang lưu…" → "Đã lưu" (debounce 800ms) · lỗi lưu → giữ nội dung + banner
"Chưa lưu được, thử lại" (không mất chữ cô vừa gõ) · export → nút loading + tải file.

**Tương tác:** "Điểm danh tất cả: Đúng giờ" (nút nhanh, có Hoàn tác) · chọn nghỉ → textarea tự
prefill gợi ý "Em nghỉ buổi này, cô nhắc bài…" (cho phép xoá) · Tab/Shift-Tab đi giữa các ô nhanh ·
nút "Chèn mẫu nhận xét" (3–5 mẫu cô soạn sẵn).

**Dữ liệu (bảng mới ❓C3):** `session_attendances(id, class_session_id, user_id,
status enum('on_time','late','absent'), comment text null, updated_by, timestamps,
UNIQUE(class_session_id,user_id))`.
API: `GET /sessions/{id}/attendances` · `PUT /sessions/{id}/attendances/bulk`
`{items[{user_id,status,comment}]}` · `GET /sessions/{id}/attendances/export?format=xlsx|pdf`.

**Responsive:** <1280 rail → dropdown · <1024 mỗi HV thành card dọc (tên → radio → textarea).

**Edge:** HV mới thêm vào lớp giữa kỳ → chỉ hiện ở các buổi từ ngày tham gia (các buổi trước để
"—") · 2 tab cùng sửa → last-write-wins + toast "Nội dung đã được cập nhật ở nơi khác" ·
export khi chưa điểm danh ai → cảnh báo trước.

---

### Admin 11 — Chi tiết lớp → tab Báo cáo

**Mục đích / user:** cô nhìn sức khoẻ lớp: tổng quan, xu hướng điểm, tiến trình theo buổi, xếp theo HV.
**Chỉ tính bài được giao** (không tính tự luyện).

**Bố cục:**

```
← Lớp 6A1     [Giao bài][Nhận xét][Báo cáo][Học viên]   Kỳ: [30 ngày ▾] [⬇ Excel]
┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│HV hoạt   ││Bài hoàn  ││Lượt làm  ││Thời gian │  ← StatCard + delta so kỳ trước
│động 24/28││thành 96  ││ 142      ││ 38h      │
│  ▲ +3    ││  ▲ +12   ││  ▼ −5    ││  ▲ +4h   │
└──────────┘└──────────┘└──────────┘└──────────┘
┌─ Điểm TB theo tuần (line) ─────────┐┌─ Phổ điểm (5 dải, bar) ──────────┐
│  8 ┤      ╭─╮                      ││ 0–2 ▏2                           │
│  6 ┤ ╭────╯ ╰──                    ││ 2–4 ▎5   … 8–10 ████ 12          │
└────────────────────────────────────┘└──────────────────────────────────┘
┌─ Tiến trình theo buổi ──────────────────────────────────────────────────┐
│ BUỔI │ ĐÃ GIAO │ ĐÃ LÀM │ % HOÀN THÀNH │ % ĐIỂM TB │ (bar nhỏ inline)   │
└─────────────────────────────────────────────────────────────────────────┘
┌─ Báo cáo học viên (sortable) ───────────────────────────────────────────┐
│ HV │ % HOÀN THÀNH │ LƯỢT │ THỜI GIAN │ BÀI <60% │ BUỔI ĐI HỌC │ TUẦN TRƯỚC│
└─────────────────────────────────────────────────────────────────────────┘
```

**Component:** `StatCard`(×4, có sparkline + delta), 🆕 `LineChart`, 🆕 `BarChart` (Recharts —
legend + tooltip, không chỉ dựa màu), `DataTable`(sortable ×2), `FilterBar(period)`, `ExportMenu`, `Skeleton`.

**Trạng thái:** loading skeleton chart (khối xám đúng tỉ lệ) · rỗng "Chưa đủ dữ liệu — cần ít nhất
1 bài đã nộp" (ẩn chart, giữ 4 card = 0) · dữ liệu đang tính (job chưa chạy) → badge
"Số liệu tính đến 06:00 hôm nay" · lỗi → banner + Thử lại.

**Tương tác:** đổi kỳ (7/30/90 ngày, tuỳ chọn) → refetch · click HV trong bảng → hồ sơ HV ·
click dải phổ điểm → lọc bảng HV theo dải · hover chart → tooltip; **không** animation chart quá 300ms.

**Dữ liệu:** `GET /classrooms/{id}/report?period=30d` →
`{stats{active_students,completed,attempts,study_seconds, delta{...}}, weekly_avg[{week,score}],
score_buckets[{range,count}], by_session[{session,assigned,done,completion_pct,score_pct}],
by_student[{user,completion_pct,attempts,study_seconds,low_score_count,attended,last_week_score}]}`.
Aggregate **precompute bằng job định kỳ** (cache Redis, TTL 1h) — dùng **chung endpoint** với FE STT12
(khác scope: `?scope=class|student`). Chỉ lấy `test_attempts` có `mission_id != null` (bài giao).

**Responsive:** ≥1440 2 chart cạnh nhau · 1024–1439 chart xếp dọc · <1024 card 2×2, bảng cuộn ngang.

**Edge:** lớp mới (chưa có kỳ trước) → ẩn delta thay vì hiện +0% · HV mới vào giữa kỳ → % tính từ
ngày tham gia (tooltip ghi rõ) · bài chờ chấm → không tính vào điểm TB, hiện ghi chú "6 bài chưa chấm".

---

### Admin 12 — Chi tiết lớp → tab Học viên

**Mục đích / user:** cô quản lý thành viên lớp: thêm 3 cách, reset mật khẩu, gỡ khỏi lớp.

**Bố cục:**

```
← Lớp 6A1        [Giao bài][Nhận xét][Báo cáo][Học viên]
🔍 Tìm HV                                   [+ Thêm học viên ▾]
                                             ├ Tạo nhanh
▸ Đã chọn 2 → [Gỡ khỏi lớp] [Đặt lại MK]    ├ Chọn từ danh sách có sẵn
┌─┬───┬────┬──────────────────┬──────────────┬──────────┬────────────────┐
│☐│ # │ ID │ HỌ TÊN (avatar)  │ EMAIL        │ TRẠNG    │ HÀNH ĐỘNG      │
│☐│ 1 │ 12 │ ● Nguyễn Minh Anh│ minhanh@…    │ Đang học │ 🔑 👁 ✕        │
└─┴───┴────┴──────────────────┴──────────────┴──────────┴────────────────┘
28 học viên
```

**Component:** `DataTable(selectable)`, 🆕 `AddStudentMenu` (3 nhánh), 🆕 `StudentPickerModal`
(bảng HV toàn trung tâm + checkbox, tái dùng API Admin 2), `ImportExcelModal` (dùng lại),
`ConfirmDialog`, `Toast`.

**Trạng thái:** rỗng "Lớp chưa có học viên — Thêm học viên đầu tiên" · Tạo nhanh: form gọn
(Họ tên + Email + MK tạm tự sinh) trong modal sm, tạo xong ở lại modal để nhập tiếp (nút "Lưu &
thêm tiếp") · reset MK → confirm → panel hiện MK mới + Copy (1 lần) · gỡ khỏi lớp → confirm
"Chỉ gỡ khỏi lớp, tài khoản vẫn còn".

**Dữ liệu:** `GET /classrooms/{id}/students` · `POST /classrooms/{id}/students {user_ids[]}` ·
`POST /classrooms/{id}/students/quick {name,email}` · `DELETE /classrooms/{id}/students/{userId}` ·
`POST /students/{id}/reset-password` → `{temp_password}` · dùng `class_user.status`.

**Responsive:** <768 card list, actions vào menu ⋯.

**Edge:** HV đã ở lớp khác → vẫn thêm được (nhiều lớp), picker hiện chip lớp hiện tại ·
gỡ HV có bài đang làm → cảnh báo "bài đang làm sẽ được giữ, HV không thấy lớp nữa" ·
thêm HV đã có trong lớp → picker disable + tooltip "Đã ở trong lớp".

---

### Admin 13 — Kết quả làm bài ⚠️ (đổi #1, #2, #7)

**Mục đích / user:** cô xem mọi bài làm, lọc nhanh **Bài chờ chấm**, vào chấm, xuất Excel.

**Bố cục:**

```
Kết quả làm bài                                          [⬇ Xuất Excel]
┌ Tabs nhanh: [Tất cả 412] [🟡 Chờ chấm 9] [Đang làm 5] [Đã xong 398] ┐
🔍 Tên đề / HV  [Lớp ▾][Dạng ▾][Nguồn ▾][Trạng thái ▾][Từ ngày–Đến ngày]
┌─┬──┬───────────────┬─────┬──────────────┬─────┬──────┬────────┬──────────┬────┐
│☐│# │ TÊN ĐỀ        │ DẠNG│ HỌC SINH     │ LỚP │ ĐIỂM │ NGUỒN  │ TRẠNG    │ ⋯  │
│☐│1 │ Unit 5 Mini   │ 🎧 N│ Minh Anh     │ 6A1 │ 8.5  │ Bài giao│ Đã xong │👁✎🗑│
│☐│2 │ Writing Holi. │ ✍ W │ Gia Hân      │ 8C1 │  —   │ Bài giao│🟡Chờ chấm│👁   │
│☐│3 │ KT 15 phút    │ 📝 TN│ Đức Huy     │ 7B2 │ 6.0  │ Tự luyện│ Đã xong │👁   │
└─┴──┴───────────────┴─────┴──────────────┴─────┴──────┴────────┴──────────┴────┘
```

**Component:** `Tabs(pill, có badge số)`, `DataTable(selectable)`, `FilterBar` (có date range),
`SkillBadge`, `StatusBadge`, `ExportMenu`, `EmptyState`, `Pagination`.

**Trạng thái:** loading skeleton · rỗng theo tab ("Không có bài chờ chấm — tuyệt vời!") · điểm
`—` khi chưa chấm · export nhiều dòng → toast "Đang tạo file…" rồi tải · bài `expired` → badge
danger "Hết giờ (tự nộp)".

**Tương tác & luồng:** hàng / 👁 → **Admin 14** (chi tiết + chấm); tab Chờ chấm + nút
"Chấm lần lượt" → mở Admin 14 ở chế độ hàng chờ (Lưu & bài tiếp theo) · ✎ → sửa điểm nhanh
(modal) · 🗑 → confirm (xoá bài làm, không xoá đề) · bulk: Xuất Excel / Xoá.

**Dữ liệu:** `GET /attempts?q&classroom_id&test_id&skill&source&status&from&to&page` →
`{data[{id,test{title,skill},user{name,email},classroom,total_score,source,status,started_at,
submitted_at,cheat_count}],meta,counts{all,pending_review,in_progress,submitted}}` ·
`GET /attempts/export` · `PATCH /attempts/{id}/score` · `DELETE /attempts/{id}`.
**Field cần bổ sung:** `test_attempts.source enum('assigned','self_practice')` (quy tắc 2 Thư viện),
`status` mở rộng `paused|pending_review|graded` (xem C-nhỏ ở §0), `paused_at`, `cheat_count`,
`graded_by`, `graded_at`. Điểm hiển thị **thang 10, 1 chữ số thập phân** (`scale_10_even`).

**Responsive:** <1280 ẩn cột Nguồn/Lớp (đưa vào dòng phụ) · <768 card list, tab thành select.

**Edge:** đề bị xoá nhưng còn bài làm → hiện tên đề dạng chữ xám + "(đề đã xoá)" · HV làm lại
nhiều lần (tự luyện) → nhóm theo HV+đề, cột "Lần 3/5" và tooltip điểm cao nhất ·
1 bài mixed (có cả writing) → trạng thái "Chờ chấm" dù phần trắc nghiệm đã có điểm; điểm hiện
"6.0 + chờ" để cô hiểu.

---

### Admin 14 — Chi tiết bài làm (xem + chấm) ⚠️ (đổi #1, #2, #3, #7)

**Mục đích / user:** cô review từng câu (trắc nghiệm/nghe: máy chấm, cô sửa được) và **chấm
Writing** (tay hoặc nhờ AI ❓C4), thấy cảnh báo gian lận, gửi nhận xét.

**Bố cục (3 cột; cột hàng chờ chỉ hiện khi vào từ tab "Chờ chấm"):**

```
← Writing — My summer holiday · Lớp 8C1        Bài 3/6 chờ chấm
                                     [Chấm lại tự động] [Xuất kết quả] [Lưu & bài tiếp →]
┌ HÀNG CHỜ ─┐ ┌─ BÀI LÀM ─────────────────────────┐ ┌─ CHẤM ĐIỂM ──────────┐
│ ✓ K.Linh 8│ │ ● Lê Gia Hân · nộp 15/07 20:48    │ │ Thang 10 · chia đều  │
│ ✓ T.Ngân 7│ │ 168 từ · 26 phút · ⚠ 2 lần rời tab│ │ ┌ Tiêu chí (rubric) ┐│
│ ● G.Hân   │ │ ┌ ĐỀ BÀI + GỢI Ý ───────────────┐ │ │ │ Đủ ý     [2.0/2.5]││
│   Đ.Huy   │ │ │ Write about your last summer… │ │ │ │ Ngữ pháp [1.5/2.5]││
│   Q.Phúc  │ │ └───────────────────────────────┘ │ │ │ Từ vựng  [2.0/2.5]││
│   B.Châu  │ │ ┌ BÀI VIẾT (chọn chữ để bôi lỗi)┐ │ │ │ Mạch lạc [2.0/2.5]││
│           │ │ │ Last summer my family went…   │ │ │ └───────────────────┘│
│ 2/6 đã    │ │ │ …I ~~swim~~(đỏ) in the sea…   │ │ │ TỔNG:  [ 7.5 ] /10   │
│ chấm      │ │ └───────────────────────────────┘ │ │ ⚠️[✨ Nhờ AI chấm]   │
│           │ │ (writing) / (TN: review từng câu) │ │  → gợi ý 7.0 + nhận  │
│           │ │                                   │ │    xét, cô sửa được  │
│           │ │                                   │ │ Nhận xét cho HS:     │
│           │ │                                   │ │ [textarea + mẫu]     │
│           │ │                                   │ │ ☑ Gửi thông báo      │
│           │ │                                   │ │ [Lưu điểm]           │
└───────────┘ └───────────────────────────────────┘ └──────────────────────┘
```

**Chế độ Trắc nghiệm / Nghe** (thay khối giữa): danh sách câu — số câu · nội dung · **đáp án HV
chọn** vs **đáp án đúng** · badge Đúng/Sai · `explanation` · điểm/câu (ô số, cô sửa được) ·
**câu nghe có `AudioPlayer`** để cô nghe lại đúng đoạn ⚠️. Filter chip: Tất cả / Đúng / Sai / Chưa chấm.

**Component:** 🆕 `GradingQueueRail`, 🆕 `AttemptOverviewBar` (HV · mã bài · thời gian · câu sai ·
**cảnh báo gian lận** dạng badge + popover chi tiết mốc thời gian), 🆕 `AnswerReviewList`
(dùng `QuestionRenderer` mode `review`), `AudioPlayer`, 🆕 `RubricScorer` (slider/ô số theo tiêu chí,
tự tổng), 🆕 `AiGradeButton` + `AiSuggestionPanel` (❓C4, ẩn khi flag off), 🆕 `InlineAnnotator`
(bôi lỗi trên bài viết), `Textarea` + `TemplatePicker`, `Toast`, `ConfirmDialog`.

**Trạng thái:** loading skeleton 3 cột · bài `in_progress` → banner "HV đang làm bài, chưa thể
chấm" (readonly) · AI: `idle → loading (skeleton panel + "AI đang đọc bài…")→ có kết quả (panel
gợi ý, nút Áp dụng / Bỏ qua) → lỗi ("AI không phản hồi, cô chấm tay nhé" + Thử lại)` · lưu → toast
"Đã lưu điểm 7.5 · đã gửi thông báo cho Gia Hân" · quá 1 tab cùng chấm → cảnh báo xung đột.

**Tương tác & luồng:** [Lưu & bài tiếp theo] → chuyển bài kế trong hàng chờ (giữ vị trí cuộn) ·
"Chấm lại tự động" → confirm (tính lại điểm máy, giữ điểm tay đã sửa? → hỏi rõ 2 lựa chọn) ·
Từ Admin 13 vào; sau khi lưu → trạng thái `graded`, HV nhận thông báo (FE STT3) và thấy điểm +
nhận xét (FE STT8).

**Dữ liệu:** `GET /attempts/{id}` (kèm `answers[]`, `questions[]`, `cheat_events[]`, `rubric`) ·
`PUT /attempts/{id}/grade` `{scores[{question_id,score}]|rubric_scores{},total_score,feedback,
notify:bool,annotations[]}` · `POST /attempts/{id}/regrade` · `POST /attempts/{id}/ai-grade`
→ `{suggested_score,rubric_breakdown,feedback}` (❓C4) · `GET /attempts/{id}/export`.
**Field cần bổ sung:** `test_attempts.feedback`, `graded_by`, `graded_at`, `cheat_count`;
bảng `attempt_cheat_events(attempt_id,type,at)`; `attempt_answers.annotations json`;
`tests.rubric`; (AI) `ai_grade_suggestions(attempt_id,payload json,created_at)`.

**Responsive:** <1440 ẩn rail hàng chờ (thành dropdown "Bài 3/6 ▾") · <1280 cột chấm điểm xuống
dưới bài viết (sticky bottom bar chứa Tổng điểm + Lưu) · <768 banner "Chấm bài trên máy tính".

**Edge:** bài writing vượt 150 từ → badge "168/150 từ — vượt giới hạn" để cô biết khi trừ điểm ⚠️ ·
HV nộp file rỗng / bài trắng → panel "HV không nhập nội dung" + cho chấm 0 · đề bị sửa sau khi HV
nộp → dùng **snapshot câu hỏi tại thời điểm nộp**, banner "Đề đã thay đổi sau khi nộp" ·
điểm nhập > 10 hoặc âm → chặn tại field · gian lận > 5 lần → badge đỏ nổi bật, popover liệt kê mốc.

---

## 4. Phân hệ FE học sinh — 12 màn

**Shell chung (mobile-first 375+)** — mô tả 1 lần (chi tiết ở [FE 3](#fe-3--bố-cục-chung-layout)):

```
MOBILE (375–767)                    DESKTOP (≥1024)
┌───────────────────────────┐       ┌────────┬────────────────────────────┐
│ ☰  Anh ngữ   🔍  🔔  ⚠   │       │ Sidebar│ Header: 🔍 · 🔔 · Báo lỗi  │
│───────────────────────────│       │ Nhiệm  │────────────────────────────│
│                           │       │ vụ     │                            │
│   Content 1 cột           │       │ Lớp    │   Content (max 1120)       │
│   (card trắng, gap 16)    │       │ Thư    │                            │
│                           │       │ viện   │                            │
│                           │       │ Báo cáo│                            │
│───────────────────────────│       │────────│                            │
│ [Nhiệm vụ][Lớp][TV][BC]   │ ←nav  │ [user] │   Footer (chỉ desktop)     │
└───────────────────────────┘       └────────┴────────────────────────────┘
```

- Bottom nav **đúng 4 mục**, cao 60px + safe-area iOS, active = brand + icon fill nhẹ.
- Mọi CTA chính cao **48px**, full-width trên mobile. Touch ≥ 44px, khoảng cách nút ≥ 8px.
- PWA: manifest + icon; màn làm bài & flashcard hoạt động khi mạng yếu (autosave localStorage,
  đồng bộ lại khi có mạng) + banner "Đang offline — bài làm đã lưu trên máy".

---

### FE 1 — Đăng nhập ♻️

**Mục đích / user:** HS đăng nhập bằng tài khoản cô cấp. **Có "Quên mật khẩu"** (khác admin).

```
┌───────────────────────────┐
│        [logo]             │
│   Chào mừng trở lại!      │  ← h1 24/700
│   Đăng nhập để tiếp tục   │
│  ┌─────────────────────┐  │
│  │ Email               │  │
│  │ [.................] │  │
│  │ Mật khẩu            │  │
│  │ [...............👁] │  │
│  │        Quên mật khẩu?│ │
│  │ [    Đăng nhập    ] │  │  ← 48px, primary
│  └─────────────────────┘  │
│  Chưa có tài khoản?       │
│  Liên hệ cô để được cấp.  │
└───────────────────────────┘
```

**Component:** ♻️ logic `app/login/page.tsx` + `lib/auth`, 🆕 `AuthLayout`, `FormField`, `Input`,
`Button(primary,fullWidth,loading)`, `Toast`. Màn phụ 🆕 `/forgot-password` + `/reset-password`.

**Trạng thái:** loading nút · 401 → banner trong card · 422 → dưới field · tài khoản khoá →
"Tài khoản đang tạm khoá, liên hệ cô giáo" · quên MK: gửi xong → EmptyState "Đã gửi link vào email"
(không tiết lộ email có tồn tại) · thiếu SMTP → **ẩn link Quên mật khẩu** bằng env flag.

**Tương tác:** thành công → `/missions` (hoặc `?next=`); role teacher → `/teacher`.

**Dữ liệu:** `POST /auth/login` · `POST /auth/forgot-password {email}` ·
`POST /auth/reset-password {token,password}` · `GET /auth/me`.

**Responsive:** mobile card full-width padding 24 · ≥1024 card 400px giữa trang, nền `--color-bg`.

**Edge:** bàn phím mobile che nút → `scroll-margin` + nút trong flow (không fixed) · autofill iOS ·
Caps Lock hint khi sai MK 2 lần · rate limit 429 → countdown.

---

### FE 2 — Hồ sơ cá nhân

**Mục đích / user:** HS tự cập nhật thông tin, đổi avatar/mật khẩu, đăng xuất.

```
Hồ sơ của em
┌───────────────────────────┐
│   (avatar 96) [Đổi ảnh]   │
│   Nguyễn Minh Anh · 6A1   │
└───────────────────────────┘
┌ Thông tin ────────────────┐
│ Họ tên *   [...........]  │
│ Email      [.....] 🔒     │  ← khoá, tooltip "Email là tên đăng nhập"
│ SĐT        [...........]  │
│ Ngày sinh  [__/__/____]   │
│ Giới tính  (Nam/Nữ/Khác)  │
│ Địa chỉ    [...........]  │
│ Facebook   [...........]  │
│            [ Lưu thay đổi]│
└───────────────────────────┘
┌ Bảo mật ──────────────────┐
│ [Đổi mật khẩu]            │
│ [Đăng xuất]               │
└───────────────────────────┘
```

**Component:** 🆕 `AvatarUploader` (crop vuông đơn giản), `FormField`, `Input`, `DatePicker`,
`Radio`, `Modal` (đổi MK: MK cũ + mới + nhập lại), `ConfirmDialog` (đăng xuất), `Toast`.

**Trạng thái:** loading skeleton form · lưu → nút loading + toast "Đã cập nhật hồ sơ" · lỗi 422 →
dưới field · đổi MK sai MK cũ → lỗi tại field · upload avatar > 2MB → lỗi trong uploader.

**Tương tác:** form dirty → nút Lưu mới bật; rời trang khi dirty → confirm · đổi MK thành công →
toast + **giữ session** (không bắt login lại).

**Dữ liệu:** `GET /me` · `PUT /me {name,phone,birthday,gender,address,facebook_url}` ·
`POST /me/avatar` · `PUT /me/password {current,password}`.
**Field cần bổ sung:** `users.birthday`, `gender`, `address`, `facebook_url` (+ `phone` từ Admin 2).

**Responsive:** 1 cột; ≥1024 2 cột (thông tin | avatar+bảo mật).

**Edge:** HS chưa có avatar → chữ cái đầu trên nền brand-soft · link Facebook sai định dạng → cảnh
báo mềm (vẫn lưu được nếu là URL hợp lệ) · ngày sinh tương lai → chặn.

---

### FE 3 — Bố cục chung (layout) ⚠️ (đổi #6)

**Mục đích / user:** shell mọi màn HS: nav, tìm kiếm nhanh, thông báo, báo lỗi, footer.

**Thành phần bắt buộc:**

| Vùng | Nội dung | Ghi chú |
|---|---|---|
| Bottom nav (mobile) / Sidebar (desktop) | **Nhiệm vụ · Lớp học · Thư viện · Báo cáo** | Đúng 4 mục; active brand; badge số trên "Nhiệm vụ" khi có bài quá hạn/mới. |
| Header | 🔍 tìm nhanh (phạm vi **Đề thi / Từ vựng / Tài liệu**) · 🔔 thông báo · ⚠ **Báo lỗi** · avatar → menu (Hồ sơ / Đăng xuất) | Mobile: 🔍 mở overlay full-screen. |
| Notification drawer | list thông báo (cô giao bài · bài đã chấm · sắp hết hạn), item chưa đọc có dot brand, nút **"Đọc tất cả"**, empty state | Drawer phải (desktop) / bottom sheet (mobile). Polling 60s hoặc SSE. |
| Modal Báo lỗi | Loại lỗi (select) · Mô tả · ảnh chụp (tuỳ chọn) · tự gắn URL + thiết bị | Gửi xong → toast cảm ơn. |
| Footer (desktop) | giới thiệu ngắn · lối tắt (Nhiệm vụ/Thư viện/Hồ sơ) · liên hệ (SĐT/Zalo/email cô) | Mobile ẩn footer (đã có bottom nav). |

**Component:** 🆕 `AppShell` (refactor từ `app/(app)/layout.tsx` ♻️), 🆕 `BottomNav`,
🆕 `QuickSearch` (debounce 300ms, group kết quả theo loại, keyboard ↑↓↵), 🆕 `NotificationDrawer`,
🆕 `ReportBugModal`, 🆕 `Footer`, `Toast` provider, `Skeleton`.

**Trạng thái:** `loading` auth → giữ shell + skeleton content (không màn trắng) · chưa đăng nhập →
redirect `/login` · thông báo rỗng → "Chưa có thông báo nào" · search rỗng → "Không tìm thấy" +
gợi ý 3 mục thư viện · offline → banner mỏng "Đang offline".

**Tương tác:** đổi tab giữ scroll riêng từng tab · thông báo → click đi tới đúng màn
(bài giao → chi tiết nhiệm vụ; đã chấm → kết quả) và tự đánh dấu đã đọc.

**Dữ liệu:** `GET /notifications?unread_only` · `POST /notifications/read-all` ·
`GET /search?q&scope=tests,decks,documents` · `POST /bug-reports`.
**Bảng mới:** dùng `notifications` của Laravel + `bug_reports(user_id,type,message,url,meta,created_at)`.

**Responsive:** 375 bottom nav · 768 nav vẫn dưới, content 2 cột khi cần · ≥1024 sidebar + footer.

**Edge:** > 99 thông báo → badge "99+" · safe-area iPhone (`env(safe-area-inset-bottom)`) ·
bàn phím mở trên mobile → ẩn bottom nav để không che input.

---

### FE 4 — Nhiệm vụ (trang chủ sau login) ⚠️ (đổi #6)

**Mục đích / user:** màn mặc định — HS thấy việc cần làm trong 7 ngày và việc đã xong.

```
┌ Banner ─────────────────────────────────┐
│ Chào Minh Anh 👋 (icon SVG, không emoji)│
│ Hôm nay em có 2 bài · 🔥 chuỗi 8 ngày   │
│ [progress tuần ▓▓▓▓░░ 4/6 nhiệm vụ]     │
└─────────────────────────────────────────┘
[ Nhiệm vụ 7 ngày tới (3) ] [ Hoàn thành (12) ]   ← Tabs
┌─────────────────────────────────────────┐
│ 🎧 Listening Practice 03                │
│ Đề thi · 15 câu · 20 phút               │
│ ⏰ Còn 2 ngày (24/07)      [Làm bài ›]  │
├─────────────────────────────────────────┤
│ ✍ Writing — My summer holiday           │
│ Writing · ≤150 từ          [Tiếp tục ›] │  ← đang làm (nháp)
├─────────────────────────────────────────┤
│ 📚 Deck Unit 5   12/32 từ  [Học tiếp ›] │
│ ▓▓▓▓▓░░░░░ 38%                          │
└─────────────────────────────────────────┘
```

**Component:** 🆕 `WelcomeBanner` (đếm ngược mềm + streak + progress tuần — "sinh động" trong ngân
sách §2.4), `Tabs`, 🆕 `MissionRow` (icon-tile theo loại · tên · meta · badge deadline · CTA theo
trạng thái), `ProgressBar`, `StatusBadge`, `EmptyState`, `Skeleton(row ×4)`.

**Trạng thái:** loading 4 row skeleton · rỗng tab 1 → "Chưa có nhiệm vụ nào — vào Thư viện tự luyện
nhé" + CTA Thư viện · rỗng tab 2 → "Chưa hoàn thành bài nào" · lỗi → banner + Thử lại ·
quá hạn → badge danger "Quá hạn 1 ngày" nhưng **vẫn cho làm** (cô thấy nộp muộn).

**Tương tác & luồng:** CTA theo loại → Đề thi/Nghe → FE 7 (qua intro) · Writing → FE 8 ·
Từ vựng → FE 9 · Tài liệu/Bài giảng → FE 10. Hoàn thành 1 nhiệm vụ → row chuyển tab kèm
**confetti 1 lần** (§2.4) + toast "Tuyệt vời! Còn 2 nhiệm vụ".

**Dữ liệu:** `GET /missions?window=7d&status=todo,in_progress` ·
`GET /missions?status=done&page` → item gồm `{id,type,title,meta,due_date,status,progress,
target{type,id},attempt_id?}` · `GET /me/streak`.

**Responsive:** 1 cột mọi breakpoint (≥1024 max 800px, banner 2 cột).

**Edge:** nhiều nhiệm vụ cùng deadline → sort theo hạn gần nhất rồi tên · nhiệm vụ có
`attempts_allowed=1` đã làm → CTA "Xem kết quả" · deadline hôm nay → badge warning "Hết hạn hôm nay
· 23:59" · nhiệm vụ bị cô gỡ → biến mất kèm toast khi refresh.

---

### FE 5 — Lớp học của tôi + Chi tiết lớp

**Mục đích / user:** HS xem lớp đang học, mở lộ trình theo buổi, thấy tiến độ.

```
(a) Lớp học của tôi              (b) ← Lớp 6A1 · Cô Uyên
┌─────────────────────────┐      ┌ TIẾN TRÌNH HỌC TẬP ─────────────┐
│ [ảnh bìa]               │      │ ✓ Buổi 1 — Greetings      100%  │
│ Lớp 6A1   ● Đang học    │      │ ✓ Buổi 2 — Numbers         80%  │
│ Cô Uyên · 28 bạn        │      │ ● Buổi 3 — Present Simple  40%  │
│ Tiến độ ▓▓▓▓▓░░ 62%     │      │ ○ Buổi 4 — (chưa mở)            │
│ [Vào học]               │      └─────────────────────────────────┘
└─────────────────────────┘      ┌ Buổi 3 · Ghi chú của cô ────────┐
                                 │ "Các em xem bài giảng trước…"    │
                                 └─────────────────────────────────┘
                                 📝 Đề thi (2)
                                 │ Unit 5 Mini Test  8.5đ ✓         │
                                 │ Listening 03      chưa làm  [›]  │
                                 📚 Từ vựng (1)  Deck Unit 5 12/32  │
                                 📄 Tài liệu (1) Ngữ pháp QĐ  đã xem│
```

**Component:** 🆕 `ClassCard` (bản HS), 🆕 `SessionAccordion` (buổi + % + trạng thái mở/khoá),
🆕 `SessionItemGroup` (nhóm theo loại, mỗi item có tiến độ riêng), `ProgressBar`, `StatusBadge`,
`EmptyState`, `Skeleton`.

**Trạng thái:** loading skeleton · **chưa được gán lớp** → EmptyState "Em chưa ở lớp nào — liên hệ
cô giáo" · buổi chưa tới ngày/chưa giao → item khoá + tooltip "Cô chưa mở buổi này" · ghi chú rỗng → ẩn khối.

**Tương tác:** 1 lớp → vào thẳng chi tiết; nhiều lớp → list · click item → màn tương ứng
(FE 7/8/9/10) và **quay lại đúng buổi** (giữ state qua query `?session=`) · tiến độ cập nhật ngay
khi từ màn làm bài trở về (optimistic + refetch).

**Dữ liệu:** `GET /me/classrooms` · `GET /classrooms/{id}/roadmap` →
`{sessions[{id,order,title,note,progress_pct,locked,items[{type,id,title,status,progress,score}]}]}`.
Mirror Admin 9 nhưng ẩn thông tin của HS khác.

**Responsive:** mobile accordion 1 cột (buổi đang học tự mở) · ≥1024 2 cột (rail buổi | nội dung).

**Edge:** lớp đã kết thúc → banner "Lớp đã kết thúc, em vẫn xem lại được" · item bị cô gỡ giữa lúc
xem → toast + refresh · tiến độ deck tính theo `known/total`, tài liệu theo "đã xem".

---

### FE 6 — Thư viện (tự luyện) ⚠️ (đổi #4)

**Mục đích / user:** HS tự luyện ngoài bài giao. Hub 3 mục + list đề có **tab thư mục do cô tạo**
+ lịch sử làm bài.

```
Thư viện
┌──────────┐┌──────────┐┌──────────┐
│📝 Đề thi ││📚 Từ vựng││📄 Tài liệu│
│  42 đề   ││  8 bộ    ││  15 mục   │
└──────────┘└──────────┘└──────────┘

(Thư viện Đề thi)  [Lịch sử làm bài]
[Tất cả][Lớp 6A1 ▾][KT 15 phút][Giữa kỳ][Unit 5]   ← tab thư mục ⚠️
🔍 Tìm đề
┌────────────────────────────────────────┐
│ 🎧 Listening Practice 03               │
│ Nghe · 15 câu · 20 phút                │
│ Cao nhất 8.5 · đã làm 2 lần [Làm bài ›]│
├────────────────────────────────────────┤
│ 📝 KT 15 phút số 2  · chưa làm [Làm bài]│
└────────────────────────────────────────┘
```

**Chi tiết đề (intro trước khi làm):** tên · dạng · số câu · thời gian · điểm cao nhất ·
**"Kiểm tra thiết bị"** (⚠️ với đề Nghe: nút phát audio thử + thanh âm lượng) · số lần đã làm ·
[Bắt đầu làm bài].

**Component:** 🆕 `LibraryHub` (3 card lớn), `Tabs(pill, scroll ngang mobile)`, 🆕 `TestListRow`,
🆕 `TestIntroCard`, 🆕 `DeviceCheck` (audio test), `FilterBar(search)`, `EmptyState`, `Pagination`.

**Trạng thái:** loading skeleton · rỗng: "Cô chưa mở đề nào trong thư viện" (quy tắc 1) ·
thư mục rỗng → "Thư mục này chưa có đề" · lịch sử rỗng → "Em chưa làm bài tự luyện nào".

**Tương tác & luồng:** Làm bài → intro → FE 7/8 với `source=self_practice` (**quy tắc 2**) ·
thư viện cho **làm lại nhiều lần** (quy tắc 3) → intro hiện "Lần thứ 3" + điểm cao nhất ·
"Lịch sử làm bài" → list attempt → kết quả.

**Dữ liệu:** `GET /library/summary` → `{tests_count,decks_count,documents_count}` ·
`GET /library/tests?category_id&q&page` (chỉ `is_published=true`; đề writing loại trừ mặc định) ·
`GET /library/test-categories` (⚠️ nhóm theo lớp HS đang học) · `GET /me/attempts?source=self_practice`.

**Responsive:** hub 3 card ngang mobile (scroll) → 3 cột desktop; tab thư mục scroll ngang có
gradient mờ 2 đầu.

**Edge:** HS ở 2 lớp → tab thư mục nhóm theo lớp, mặc định lớp đang học gần nhất ⚠️ ·
đề bị cô tắt giữa lúc HS đang ở intro → khi bấm Bắt đầu báo "Đề không còn khả dụng" ·
đề writing xuất hiện trong thư viện (nếu cô bật) → cảnh báo "Bài này cô sẽ chấm tay".

---

### FE 7 — Màn làm bài (test player: trắc nghiệm + NGHE) ⚠️ (đổi #1, #7) 🔥

**Mục đích / user:** khối nặng nhất FE. Render `Part → Section → Question` khớp import Word;
4 loại câu; timer server; autosave; chống gian lận; nộp → chấm ngay + review.

```
MOBILE                                  DESKTOP (≥1024)
┌─────────────────────────────┐  ┌──────────────────────────┬──────────────┐
│ ← Unit 5 Mini  ⏱12:34  [⋮] │  │ ← Unit 5 Mini Test       │ ⏱ 12:34      │
│ ▓▓▓▓▓▓░░░░ Câu 7/20        │  │ [PART 1 · LISTENING]     │ Đã trả lời 7 │
│─────────────────────────────│  │ ┌ Audio ─────────────┐   │ Chưa làm  12 │
│ [🎧 PART 1 · LISTENING]     │  │ │ ▶ ▓▓▓░░ 0:38/2:14  │   │ Đánh dấu   1 │
│ ┌ Audio ───────────────────┐│  │ │ Còn 1 lần nghe     │   │──────────────│
│ │ ▶ ▓▓▓░░░ 0:38/2:14       ││  │ └────────────────────┘   │ 1 2 3 4 5    │
│ │ Còn 1 lần nghe · 🔊 ▓▓▓  ││  │ Câu 7. Where is the…     │ 6 ⑦ 8 9 10   │
│ └──────────────────────────┘│  │ ◉ A To the library       │ 11…20        │
│ Câu 7. Where is the boy…  ⚑ │  │ ○ B To the park          │──────────────│
│ ┌──────────────────────────┐│  │ ○ C To his house         │ [ Nộp bài ]  │
│ │ ◉ A  To the library      ││  │ [‹ Trước]      [Sau ›]   │ mã #QZ-2481  │
│ │ ○ B  To the park         ││  └──────────────────────────┴──────────────┘
│ └──────────────────────────┘│
│ [‹ Trước]  [Sau ›]          │  ⋮ = cỡ chữ S/M/L · âm lượng · lưới câu
│─────────────────────────────│      (bottom sheet trên mobile)
│ [ Lưới câu ]   [ Nộp bài ]  │
└─────────────────────────────┘
```

**4 loại câu (dùng `QuestionRenderer`):** `multiple_choice` radio A/B/C/D (ô bấm cả dòng, ≥48px) ·
`fill_blank` input inline trong câu (normalize hoa/thường, nhiều đáp án `/`) ·
`select` dropdown/segmented (True/False/Not Given) · `upload` → chuyển sang FE 8 (writing).
**Passage đọc hiểu:** desktop 2 cột (passage cuộn riêng | câu hỏi); mobile tab "Bài đọc | Câu hỏi"
hoặc passage collapse dính trên. **Câu nghe:** `AudioPlayer` cấp section hoặc cấp câu ⚠️,
`allowSeek=false`, đếm "còn n lần nghe", hết lượt disable + text rõ.

**Component:** 🆕 `TestPlayerShell`, `QuestionRenderer`, `AudioPlayer` ⚠️, `Countdown`,
🆕 `QuestionGrid` (ô 44px: trắng=chưa · brand=đã trả lời · amber=đánh dấu · viền đậm=hiện tại),
🆕 `BookmarkToggle`, 🆕 `PlayerSettings` (cỡ chữ S/M/L + âm lượng), `ProgressBar`, `ConfirmDialog`,
`Toast`, 🆕 `OfflineBanner`.

**Trạng thái:** loading → skeleton câu (không hiện timer trước khi có `endsAt` từ server) ·
autosave: badge "Đã lưu" nhỏ, lỗi lưu → "Chưa lưu được — đang thử lại" (giữ đáp án ở localStorage) ·
**hết giờ** → tự nộp + modal "Đã hết thời gian, bài đã được nộp" · nộp → loading overlay ngắn →
màn kết quả · rời trang → `beforeunload` confirm · offline → banner + vẫn làm được.

**Tương tác & luồng:** vào từ FE 4/5/6 (kèm `source`, `mission_id`) · Nộp → confirm nêu
"Còn 12 câu chưa trả lời" · sau nộp → **review đúng/sai + `explanation`** (`==LG`) ·
điểm hiển thị **thang 10, chia đều** (đổi #7) và ghi rõ "0.5đ/câu" · gian lận: đếm
`visibilitychange`/blur → gửi kèm khi nộp (không cảnh báo HS quá mức, chỉ toast nhẹ lần đầu:
"Em nhớ không rời khỏi màn hình khi đang làm bài").

**Dữ liệu:** `POST /tests/{id}/attempts {source,mission_id?}` → `{attempt_id,ends_at,questions[]}`
(**không** trả `is_correct`/`explanation`) · `PATCH /attempts/{id}/answers` (debounce 1.5s, batch) ·
`POST /attempts/{id}/pause` · `POST /attempts/{id}/submit {cheat_events[]}` →
`{total_score,correct_count,question_count,answers[{is_correct,correct_option,explanation}]}` ·
`POST /attempts/{id}/audio-play {question_id|section_id}` (đếm lượt nghe server-side ⚠️).
**Field:** `test_sections.max_plays`, `attempt_answers.play_count`, `test_attempts.cheat_count`,
`paused_at`, `source`.

**Responsive:** 375 1 câu/màn + lưới câu trong bottom sheet · 768 2 cột nhẹ · ≥1024 sidebar phải cố định.

**Edge:** F5 giữa bài → khôi phục đúng câu + timer còn lại từ server · 2 thiết bị cùng làm 1 attempt
→ chặn thiết bị sau ("Bài đang được làm ở thiết bị khác") · audio lỗi tải → nút "Thử lại" + báo cô ·
hết giờ khi đang gõ `fill_blank` → vẫn lưu ký tự cuối trước khi nộp · đề rỗng/ lỗi cấu trúc →
"Đề đang được cô cập nhật" + về Nhiệm vụ.

---

### FE 8 — Màn làm bài Writing ⚠️ (đổi #2, #3)

**Mục đích / user:** HS viết 1 đoạn ≤150 từ theo đề + gợi ý của cô, có **đếm từ**, autosave, nộp
→ chờ chấm → xem điểm + nhận xét.

```
┌ ← Writing — My summer holiday      ⏱ 24:10 ┐
│ ┌ ĐỀ BÀI ─────────────────────────────────┐│
│ │ Write about your last summer holiday.   ││
│ │ Gợi ý: where · who with · what you liked││
│ └─────────────────────────────────────────┘│
│ ┌ BÀI VIẾT CỦA EM ────────────────────────┐│
│ │ Last summer my family went to Da Nang…  ││
│ │                                         ││
│ │                                         ││
│ └─────────────────────────────────────────┘│
│ 124/150 từ ▓▓▓▓▓▓▓▓░░   Đã lưu 15:38       │  ← WordCounter ⚠️
│ [Xem lại đề]                  [ Nộp bài ]  │
└────────────────────────────────────────────┘

Sau nộp:  ⏳ "Đã nộp — chờ cô chấm"
Đã chấm:  ✓ 7.5/10 + nhận xét của cô cạnh bài viết (đọc lại được)
```

**Component:** 🆕 `WritingEditor` (textarea thuần, không rich text — dán từ Word tự strip format),
**`WordCounter`** ⚠️ (`124/150`; ≥135 chuyển warning; >150 danger), `Countdown` (nếu đề có giới hạn),
🆕 `PromptCard` (đề + gợi ý, collapse trên mobile), `ConfirmDialog`, `StatusBadge`, 🆕 `FeedbackPanel`
(điểm + nhận xét + rubric breakdown khi đã chấm).

**Trạng thái:** loading skeleton · **nháp** (autosave 3s + "Đã lưu") · vượt 150 từ → viền danger +
message "Em đã viết 168/150 từ, hãy rút gọn lại" (❓Q4: **chặn nộp** hay chỉ cảnh báo) ·
nộp → `pending_review`: khối "Cô đang chấm bài của em" + nút "Xem lại bài đã viết" (readonly) ·
đã chấm → điểm + nhận xét + (nếu bôi lỗi) highlight ngay trong bài · hết giờ → tự nộp.

**Tương tác & luồng:** vào từ FE 4/5 · Nộp → confirm "Sau khi nộp em không sửa được nữa" ·
cô chấm xong (kể cả **AI chấm** ⚠️ — HS **không thấy** đó là AI, chỉ thấy điểm + nhận xét) →
thông báo (FE 3) → mở lại màn này ở trạng thái đã chấm.

**Dữ liệu:** `POST /tests/{id}/attempts` (đề writing) · `PATCH /attempts/{id}/answers
{question_id,answer_text}` (autosave) · `POST /attempts/{id}/submit` →
`status=pending_review` · `GET /attempts/{id}` (khi đã chấm: `total_score,feedback,rubric_scores,
annotations`).
**Field:** `tests.word_limit` (default 150), `tests.rubric`, `test_attempts.feedback`.

**Responsive:** mobile: đề collapse, textarea chiếm phần lớn màn, word counter + nút **sticky bottom**
(trên bottom nav) · ≥1024 2 cột (đề bên trái sticky | editor bên phải).

**Edge:** đếm từ tiếng Việt/Anh lẫn — quy ước **tách theo whitespace, bỏ dấu câu đứng riêng**
(ghi rõ trong tooltip "cách đếm") · dán 500 từ → cắt? **không** tự cắt, chỉ cảnh báo ·
mất mạng khi nộp → giữ nháp localStorage + nút "Thử nộp lại" · đề có cả trắc nghiệm + writing →
làm ở FE 7, phần writing là 1 câu `upload`; trạng thái tổng = Chờ chấm.

---

### FE 9 — Học từ vựng (flashcard)

**Mục đích / user:** HS học bộ thẻ: xem danh sách, lật thẻ, nghe phát âm, đánh dấu đã biết.

```
(a) Deck Unit 5 · 32 từ  ▓▓▓░░ 12/32     (b) Màn học
┌────────────────────────────────────┐   ┌──────────────────────────┐
│ souvenir  /ˈsuːvəniər/  🔊  ● đã học│   │ ▓▓▓▓░░░░░  12/32         │
│ quà lưu niệm                       │   │ ┌──────────────────────┐ │
├────────────────────────────────────┤   │ │      [ảnh 120]       │ │
│ sightseeing /ˈsaɪtsiːɪŋ/ 🔊  ○     │   │ │     souvenir         │ │
└────────────────────────────────────┘   │ │  /ˈsuːvəniər/  🔊    │ │
        [ Bắt đầu học ]                  │ └──────────────────────┘ │
                                         │      [ Lật thẻ ]         │
                                         │ [Tôi đã biết] [Tiếp tục] │
                                         └──────────────────────────┘
                                         (mặt sau: nghĩa + ví dụ,
                                          **từ khoá in đậm**)
```

**Component:** 🆕 `DeckList`, 🆕 `Flashcard` (flip 3D 300ms trục Y, tap/space để lật),
🆕 `CardProgressBar`, `AudioPlayer(sm)` / `TtsButton`, `Button`, `EmptyState`,
🆕 `SessionCompleteCard` (kết thúc: số từ đã học + confetti 1 lần + "Học lại từ chưa biết").

**Trạng thái:** loading skeleton · deck rỗng "Bộ từ này chưa có thẻ" · ảnh/audio thiếu → ẩn khối
tương ứng (không để ô trống) · audio lỗi → fallback `SpeechSynthesis` · hết thẻ → màn hoàn thành.

**Tương tác:** "Tôi đã biết" → `known`, "Tiếp tục" → `learning` (quay lại cuối vòng) ·
swipe trái/phải trên mobile = Tiếp tục / Đã biết (kèm hint lần đầu) · phím ←/→/Space trên desktop ·
tiến độ đồng bộ về FE 5 + FE 12 + báo cáo lớp admin.

**Dữ liệu:** `GET /decks?scope=library|mission` · `GET /decks/{id}/cards` ·
`PUT /cards/{id}/progress {status}` (upsert `card_progress`) · `POST /decks/{id}/session-complete`
(ghi `activity_logs`, `duration_seconds`).

**Responsive:** thẻ full-width mobile (aspect ~3:4), max 480px desktop; nút cao 48px.

**Edge:** deck giao trong buổi → hoàn thành ở ngưỡng % cô cấu hình (mặc định 80% known) →
mission `done` · học lại deck đã xong → reset vòng học nhưng **giữ** `known` cũ (hỏi:
"Học lại tất cả / chỉ từ chưa biết") · `prefers-reduced-motion` → đổi flip thành fade.

---

### FE 10 — Xem tài liệu / bài giảng

**Mục đích / user:** HS đọc nội dung được giao (hoặc tài liệu trong thư viện); ghi nhận đã xem để
tính tiến độ buổi. **1 viewer dùng cho cả 2 type.**

```
┌ ← Ngữ pháp thì quá khứ đơn ────────────┐
│ Bài giảng · Buổi 3 · cô Uyên · 10/07   │
│────────────────────────────────────────│
│ (nội dung rich text: đoạn văn, ảnh,    │
│  video nhúng 16:9, bảng)               │
│  ↳ bôi đen từ → popup tra từ (FE 11)   │
│────────────────────────────────────────│
│ 📎 File đính kèm                        │
│ · past-simple.pdf  1.2MB   [Tải về]    │
│────────────────────────────────────────│
│ [ ✓ Đánh dấu đã học xong ]             │
└────────────────────────────────────────┘
```

**Component:** 🆕 `DocumentViewer` (render body an toàn — sanitize HTML), 🆕 `AttachmentList`,
🆕 `VideoEmbed` (lazy, 16:9), `DictionaryPopover` (FE 11), `Button`, `StatusBadge`, `Skeleton`.

**Trạng thái:** loading skeleton đoạn văn · nội dung rỗng → "Nội dung đang được cô cập nhật" ·
video lỗi → khung xám + link mở ngoài · file quá lớn → hiện dung lượng, tải qua link (không preview) ·
đã xong → nút chuyển thành badge "Đã học xong ✓" + gợi ý item tiếp theo trong buổi.

**Tương tác:** cuộn tới 80% chiều dài → tự đánh dấu "đã xem" (không cần bấm); nút "Đánh dấu đã học
xong" cho chủ động · từ FE 4/5/6 vào; nút back về đúng nơi xuất phát.

**Dữ liệu:** `GET /documents/{id}` (kèm `attachments[]`) ·
`POST /documents/{id}/view` / `POST /missions/{id}/complete` → cập nhật `learning_progress`.

**Responsive:** 1 cột, max 68ch; ảnh/video full-width; ≥1024 có mục lục nhỏ (nếu có heading) bên phải.

**Edge:** tài liệu bị cô tắt sau khi giao → **vẫn xem được** nếu là bài giao (quy tắc On/Off chỉ ảnh
hưởng thư viện) · nội dung có iframe lạ → chặn bởi sanitize + hiện "Nội dung không hỗ trợ" ·
mở lại sau khi đã xong → không reset tiến độ.

---

### FE 11 — Tra từ điển khi bôi đen (xuyên suốt)

**Mục đích / user:** HS bôi đen 1 từ tiếng Anh ở màn đọc → popup nghĩa Việt + phiên âm + phát âm.

```
… he bought a [souvenir] for his mother …
                 ┌──────────────────────────┐
                 │ souvenir  /ˈsuːvəniər/ 🔊│
                 │ (n) quà lưu niệm         │
                 │ ─────────────────────────│
                 │ + Lưu vào bộ từ của em   │  ← mở rộng, có thể tắt
                 └──────────────────────────┘
```

**Component:** 🆕 `DictionaryPopover` + hook `useSelectionDictionary({enabled})`, `AudioPlayer(sm)`
hoặc `SpeechSynthesis`, `Toast` (khi lưu từ).

**Trạng thái:** đang tra → popover skeleton 1 dòng · không tìm thấy → "Không có trong từ điển" +
link tra Google (mở tab mới) · offline → dùng cache gần nhất, nếu không có → "Cần kết nối mạng" ·
bôi > 3 từ hoặc chứa chữ Việt → **không** hiện popup (tránh nhiễu).

**Tương tác & phạm vi bật:** bật ở **FE 10 (tài liệu/bài giảng)** và **màn xem lại bài đã nộp** ·
**tắt mặc định trong lúc làm bài** (chống gian lận), bật theo cấu hình đề nếu cô cho phép ·
đóng khi click ra ngoài / Esc / cuộn.

**Dữ liệu:** `GET /dictionary?word=souvenir` → `{word,ipa,pos,meaning_vi,audio_url?}` — self-host
bộ Anh–Việt (StarDict/open data), cache client (Map + localStorage 7 ngày) ·
`POST /me/vocab {word}` (mở rộng "Lưu vào bộ từ của em").
**Bảng mới (nếu làm phần lưu từ):** `user_vocab(user_id,word,meaning,ipa,created_at)`.

**Responsive:** desktop popover cạnh vùng bôi (tự flip khi sát cạnh) · **mobile → bottom sheet**
(vì selection handle che popover), cao ~200px.

**Edge:** từ số nhiều/chia động từ (`went`, `children`) → cần lemmatize đơn giản (bảng tra dạng
bất quy tắc) · popup che vùng đọc → luôn đặt phía đối diện selection · double-tap mobile chọn từ →
vẫn hoạt động; long-press không được chặn (giữ hành vi copy của hệ thống).

---

### FE 12 — Báo cáo cá nhân

**Mục đích / user:** HS xem tiến bộ của mình: 30 ngày gần nhất, phân tích theo kỹ năng, tiến độ
lớp, lịch sử làm bài & hoạt động.

```
Báo cáo của em            [Tổng quan] [Theo lớp]      Kỳ: [30 ngày ▾]
┌────────┐┌────────┐┌────────┐┌────────┐
│Điểm TB ││Bài h.  ││Lượt làm││T.gian  │  ← StatCard + sparkline tuần
│  7.8   ││thành 14││   26   ││  9h20  │
│ ▲ +0.4 ││  ▲ +3  ││  ▲ +6  ││ ▲ +2h  │
└────────┘└────────┘└────────┘└────────┘
┌ Phân tích kỹ năng theo tuần ────────────────────────┐
│ 🎧 Listening ▓▓▓▓▓▓▓▓░ 8.2   (line/radar 4 kỹ năng) │
│ 🗣 Speaking  ▓▓▓▓▓▓░░░ 6.9                          │
│ 📖 Reading   ▓▓▓▓▓▓▓▓▓ 9.0                          │
│ ✍ Writing   ▓▓▓▓▓▓░░░ 7.0                          │
└─────────────────────────────────────────────────────┘
┌ Tiến độ các lớp ─┐ ┌ Lịch sử làm bài ───────────────┐
│ Lớp 6A1  18/29   │ │ 17/07 Unit 5 Mini  8.5  [Xem]  │
│ ▓▓▓▓▓░░  62%     │ │ 15/07 Writing      chờ chấm    │
└──────────────────┘ └────────────────────────────────┘
┌ Hoạt động 7 ngày (heatmap/bar nhỏ) ─────────────────┐
└─────────────────────────────────────────────────────┘
```

**Component:** `Tabs`, `StatCard`(×4 + sparkline), 🆕 `SkillChart` (bar ngang hoặc radar —
**có nhãn số**, không chỉ màu), `ProgressBar`, `DataTable`(lịch sử, mobile → card list),
🆕 `ActivityStrip` (7 ngày), `EmptyState`, `Skeleton`.

**Trạng thái:** loading skeleton (card + chart khối xám) · **chưa có dữ liệu** → EmptyState
"Em chưa làm bài nào — bắt đầu từ Nhiệm vụ nhé" + CTA · kỹ năng chưa có bài → thanh xám "chưa có
dữ liệu" (không hiện 0 gây hiểu sai) · bài chờ chấm → không tính điểm TB + ghi chú.

**Tương tác:** đổi kỳ (7/30/90) · tab "Theo lớp" → chọn lớp → số liệu chỉ trong lớp đó ·
click dòng lịch sử → màn kết quả attempt (review + lời giải) · **phân biệt bài giao vs tự luyện**
bằng chip trong lịch sử (điểm TB tổng quan tính cả 2, nhưng có toggle "chỉ bài cô giao").

**Dữ liệu:** **dùng chung endpoint aggregation với Admin 11**, khác scope:
`GET /reports?scope=student&period=30d&classroom_id?` →
`{stats{avg_score,completed,attempts,study_seconds,delta{}},weekly[{week,skill,score}],
class_progress[{classroom,done,total,pct}],history[{attempt_id,date,test,score,status,source}],
activity[{date,minutes}]}`. Nguồn: `test_attempts` + `activity_logs` + `card_progress`.

**Responsive:** mobile card 2×2, chart cao 200px, bảng → card list · ≥1024 4 card 1 hàng, 2 chart
cạnh nhau.

**Edge:** HS mới (chưa đủ 1 tuần) → ẩn delta & sparkline, hiện "Cần thêm dữ liệu để so sánh" ·
đề bị xoá trong lịch sử → tên xám "(đề đã xoá)", không click được · thời gian học ước lượng →
tooltip "Tính từ thời gian làm bài và học thẻ".

---

## 5. Ưu tiên & bàn giao

### 5.1. Thứ tự làm (bám `KE-HOACH-SPRINT.md` + độ nặng thực tế)

| Đợt | Màn | Vì sao |
|---|---|---|
| **P0 — làm trước, nặng nhất** | **FE 7** (test player: TN + **Nghe**) · **Admin 4 + 4b** (quản lý & soạn/import đề) · **FE 8** (writing + word count) · **Admin 14** (chấm) | Trục nghiệp vụ chính; đổi #1/#3/#5/#7 đều nằm ở đây. Sprint 2 🔥. |
| **P1** | Admin 13 (kết quả) · Admin 9 (giao bài) · FE 4 (nhiệm vụ) · FE 6 (thư viện) · FE 5 (lớp HS) · FE 3 (shell + thông báo) | Không có 4 màn này thì đề đã soạn không tới được HS. Sprint 3. |
| **P2** | Admin 2 (HS) · Admin 8 + 3 (lớp) · Admin 12 (HV trong lớp) · Admin 5 (từ vựng) · FE 9 (flashcard) · FE 1/2 (login/hồ sơ) | CRUD nền, ít rủi ro; flashcard đã có skeleton. Sprint 1 & 4. |
| **P3** | Admin 6/7 (tài liệu, bài giảng) · FE 10 (viewer) · Admin 11 + FE 12 (báo cáo, **chung API**) · Admin 10 (nhận xét/điểm danh) | Phụ thuộc quyết định (❓C3, ❓Q3) và cần job aggregate. |
| **P4 — có điều kiện** | Chấm AI (Admin 14 panel) · FE 11 (từ điển) · kéo-thả-lên-ảnh (`image_drag`) · Speaking | Chờ chốt chi phí/kỹ thuật (❓Q1). Feature-flag, không chặn MVP. |

### 5.2. Màn **bắt buộc chỉnh lại** vì 8 thay đổi mới

| Màn | Thay đổi | Việc cụ thể phải làm |
|---|---|---|
| **Admin 4 — Quản lý đề thi** | #1 #3 #4 #5 #7 #8 | Thêm dạng **Nghe** vào nút Tạo + cột Dạng; **cây thư mục theo lớp** (thay category 1 cấp dùng chung); wizard Import Word **có bước gắn audio + số lần nghe**; nút **Tải Word mẫu** + drawer hướng dẫn phủ 4 loại câu & passage; `word_limit`/`rubric` cho writing; thang điểm hiện "10, chia đều". |
| **Admin 13 — Kết quả** | #1 #7 | Cột **Dạng** có Nghe; cột **Nguồn** (bài giao/tự luyện); tab nhanh **Chờ chấm**; điểm thang 10 một chữ số thập phân; trạng thái tách `pending_review`/`graded`. |
| **Admin 14 — Chấm bài** | #1 #2 #3 #7 | `AudioPlayer` khi review câu nghe; **panel AI chấm** (nút, gợi ý điểm + nhận xét, cô duyệt/sửa) sau feature-flag; `RubricScorer` theo tiêu chí cô đưa; badge cảnh báo **vượt 150 từ**; nút Chấm lại tự động. |
| **FE 7 — Test player** | #1 #6 #7 | `AudioPlayer` cấp section/câu, **giới hạn số lần nghe** (đếm server), không cho seek; layout passage 2 cột; cỡ chữ S/M/L; vi tương tác chọn đáp án; hiển thị điểm thang 10. |
| **FE 8 — Writing** | #2 #3 | **WordCounter ≤150** + cảnh báo/chặn; hiện đề + gợi ý; trạng thái `Chờ chấm → Đã chấm` + panel nhận xét (không lộ việc AI chấm). |
| **FE 6 — Thư viện** | #4 #6 | **Tab thư mục theo lớp** (thay danh mục phẳng); "Kiểm tra thiết bị" cho đề nghe; lịch sử + điểm cao nhất (quy tắc 3). |
| **Admin 9 — Giao bài / chi tiết lớp** | #1 #4 | Filter nội dung theo **thư mục của lớp**; giao được **Tài liệu/Bài giảng** (morph `Document`); cột "chờ chấm" cho item writing. |
| **FE 3/FE 4 — shell + nhiệm vụ** | #6 | Toàn bộ ngân sách "sinh động": banner streak, progress, skeleton, confetti 1 lần, transition 150–300ms — theo whitelist §2.4. |

### 5.3. Bàn giao — checklist mỗi màn trước khi coi là xong

- [ ] Đủ **5 trạng thái** (§2.6) — có screenshot loading & empty.
- [ ] Chỉ dùng token `--color-*` (không hardcode hex mới), font Quicksand.
- [ ] A11y: label thật · focus ring · trạng thái có **text** kèm màu · `aria-live` cho timer/toast ·
      contrast ≥ 4.5:1 · touch ≥ 44px.
- [ ] Responsive kiểm ở **375 / 768 / 1024 / 1440**.
- [ ] Bộ lọc/tab giữ ở **URL query**; F5 không mất ngữ cảnh.
- [ ] Animation trong whitelist §2.4 + tôn trọng `prefers-reduced-motion`.
- [ ] Gọi API **qua `lib/api/*`**, lỗi bắt `ApiError` (không `fetch` rải rác).
- [ ] Không lộ đáp án trước khi nộp (kiểm tra payload thật, không chỉ ẩn UI).

---

## 6. Câu hỏi cần cô/khách chốt

**Chặn code (phải trả lời trước khi làm P0):**

| # | Câu hỏi | Vì sao chặn | Đề xuất của ta |
|---|---|---|---|
| **Q1** | **Chấm AI:** ChatGPT Plus (gói web) **không** chấm tự động trong hệ thống được — cần **OpenAI API key** trả theo lượt. Cô đồng ý mở API key + ngân sách (~ chi phí/lượt) không? Chỉ **Writing** hay cả **Speaking**? | Quyết định có làm P4 + có cần `rubric` bắt buộc mỗi đề writing hay không. | Bật cho **Writing trước**, API key riêng, luôn để cô duyệt/sửa điểm; Speaking chờ nhóm AI. |
| **Q2** | **Format Word + đề trên web thuê (đổi #5, #8):** cô gửi giúp **3–5 đề thật** (1 đọc hiểu có passage, 1 listening, 1 trắc nghiệm nhiều dạng) đã up ở web đang thuê. | Không có đề thật thì không khoá được cú pháp parser & template — rủi ro làm lại. | Ta viết template Word + hướng dẫn sau khi xem đề thật, rồi cô up thử 1 đề để kiểm. |
| **Q3** | **Category đề theo lớp (đổi #4 — ❓C5):** thư mục đề **thuộc riêng 1 lớp** (mỗi lớp 1 cây riêng) hay **thư mục dùng chung, có gắn nhãn lớp** (1 đề nhiều lớp dùng lại được)? | Ảnh hưởng schema `test_categories` + màn Admin 4 + FE 6. | **Thư mục gắn `classroom_id`** (đúng lời cô) + cho phép `classroom_id = null` = "Dùng chung", và 1 đề có thể copy sang lớp khác. |
| **Q4** | **Writing 150 từ:** vượt 150 từ thì **chặn nộp** hay **cho nộp + cảnh báo** (cô trừ điểm)? Có tính từ tối thiểu (vd ≥80 từ) không? | Quyết định logic nút Nộp ở FE 8. | Cho nộp + cảnh báo rõ (không chặn — tránh HS mất bài), Admin 14 hiện badge "168/150". |

**Cần chốt trước sprint tương ứng:**

| # | Câu hỏi | Ảnh hưởng |
|---|---|---|
| **Q5** | **Export nhận xét** (Admin 10) định dạng nào: **Excel** (cô tự chỉnh) hay **PDF** (gửi phụ huynh luôn)? Xuất theo **buổi** hay **cả kỳ / theo HV**? | Admin 10 + thư viện export. |
| **Q6** | **Điểm danh** (❓C3) có làm trong MVP không? (`DESIGN-DATABASE` đang cấm bảng attendance) | Admin 10 + bảng mới. |
| **Q7** | **Xoá mềm** (❓C2) áp cho HV thôi hay cả đề/lớp? Thời gian giữ (30 ngày)? | Migration + filter "Đã xoá". |
| **Q8** | **Số lần nghe** mặc định cho đề Nghe: 1 · 2 · không giới hạn? Cấu hình theo **section** hay theo **đề**? | `max_plays` + FE 7. |
| **Q9** | **Làm lại bài:** bài cô giao mặc định 1 lần (đã chốt) — cô có muốn tự đặt `attempts_allowed` khi giao không? Thư viện tự luyện giới hạn bao nhiêu lần? | Admin 9 + FE 6. |
| **Q10** | **Gian lận:** ngưỡng bao nhiêu lần rời màn thì cảnh báo cô? Có **tự nộp bài** khi vượt ngưỡng không? Có hiện cảnh báo cho HS ngay lúc làm không? | FE 7 + Admin 14. |
| **Q11** | ~~Palette~~ — **ĐÃ CHỐT: Option 1** (cam `#F2793B` + kem `#FBF7EA`, Baloo 2 + Quicksand). Việc còn lại: cập nhật `frontend/docs/DESIGN-SYSTEM.md` §2 và đánh dấu mocks Lumen / navy-amber là lịch sử. | Không còn chặn. |
| **Q12** | **Thông báo:** chỉ trong web (chuông) hay cần **email/Zalo** khi cô giao bài & chấm xong? | FE 3 + hạ tầng SMTP. |
| **Q13** | **Bài giảng vs tài liệu:** có cần **giới hạn dung lượng** / xoá video cũ không? Quota 5GB có đủ? | Admin 6/7 + storage. |
| **Q14** | **Speaking:** `DAC-TA` §4 FE không có màn Speaking cho HS (chỉ nằm ở nhóm AI-1), nhưng Admin 14 có chấm Speaking. Vậy MVP có **thu âm** hay chưa? | Nếu có → thêm 1 màn FE + `upload` audio. |

---

> **Bước tiếp theo đề xuất:** cô/khách trả lời **Q1–Q4** (chặn code) và **Q11** (palette) →
> ta chốt token màu, viết **file Word mẫu + hướng dẫn** (đổi #5), rồi bắt đầu P0 với
> `components/ui/*` + FE 7 + Admin 4.
