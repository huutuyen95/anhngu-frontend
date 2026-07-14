---
name: anhngu-frontend-ui-ux
description: >-
  UI/UX and Architecture for Anh ngữ frontend (Next.js App Router): feature
  folders, API client layer, components. Use when designing, building, or
  reviewing pages, structure, colors, typography, layout, a11y, motion, charts.
---

# Anh ngữ — Frontend UI/UX

Nguồn: [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).  
Áp dụng cho **frontend Next.js** (học viên + quản trị tối thiểu). Không dùng cho pure API/Laravel.

## Khi nào dùng

- Thiết kế/refactor trang (login, thư viện, flashcard, làm bài, báo cáo, lớp học)
- Chọn palette, typography, spacing, layout **hoặc** cấu trúc folder / data-fetch
- Review UX/a11y trước khi ship
- Chart/dashboard báo cáo

## Hướng cho sản phẩm này

| Khía cạnh | Gợi ý |
|-----------|--------|
| Product type | Education / learning app (học viên) + light admin |
| Style | Flat / Soft UI / Accessible — rõ ràng, tập trung nhiệm vụ học |
| Brand | Xem **[DESIGN-SYSTEM.md](../../DESIGN-SYSTEM.md)** — primary `#002854`, accent `#F5AC3D`, font Quicksand |
| Tránh | Purple AI gradients, emoji-as-icon, dark-mode mặc định, hero marketing / balloon / FAB AI |
| Stack | Next.js App Router + CSS/Tailwind — bám design system, đừng invent palette mới |

## Architecture patterns

Chuẩn chọn cho repo: **App Router (thin routes) + Feature modules + API client layer**.  
Phù hợp codebase hiện có (`app/`, `lib/api.ts`, `lib/auth.tsx`) — không Redux/RQ bắt buộc ở MVP.

```
app/                    ← routing + layout only (mỏng)
  (app)/.../page.tsx    ← compose features; ít logic
components/
  ui/                   ← primitive: Button, Input, Badge (design system)
features/
  missions/             ← UI + hooks theo domain
  library/
  attempts/
  classrooms/
lib/
  api.ts                ← fetch wrapper + ApiError + token
  api/                  ← hàm theo resource: decks.ts, attempts.ts…
  auth.tsx              ← session/context
  types/                ← DTO khớp API
```

### Tầng trách nhiệm

| Tầng | Làm | Không làm |
|------|-----|-----------|
| `app/**/page.tsx` | Import feature, truyền params, suspense/boundary | Gọi `fetch` raw dài, style one-off không tái dùng |
| `features/<domain>/` | UI domain, hook `useX`, map dữ liệu → view | Gọi URL API trực tiếp (đi qua `lib/api/*`) |
| `components/ui/` | Primitive theo DESIGN-SYSTEM | Biết business (điểm IELTS, mission status) |
| `lib/api.ts` + `lib/api/*` | HTTP, header Bearer, parse lỗi Laravel | JSX, toast, setState |
| `lib/auth.tsx` | Login/logout, user, guard client | Query đề/deck |

### Data flow

1. UI / hook gọi `lib/api/decks.ts` → `api('/decks')`.
2. Laravel trả JSON; FE map sang type trong `lib/types`.
3. Lỗi: bắt `ApiError` (status + `errors` field) → hiện gần form / toast gọn.
4. Auth: token trong `lib/api` + context `auth` — page bảo vệ qua layout `(app)`.

### Server vs Client Component

- Mặc định **Server Component** khi không cần state/browser API.
- Thêm `'use client'` cho: form login, flashcard tương tác, timer làm bài, bottom nav active.
- Không fetch Sanctum token trên Server Component (token đang localStorage) — data private qua client + `api()`.

### Forms & state (MVP)

- Form đơn: controlled state local hoặc `<form action>` nhẹ — không bắt buộc Formik/RHF.
- State server (list đề, mission): `useState` + `useEffect` / event handler gọi API; nâng React Query sau khi có nhiều cache/invalidate.
- Không prop-drill sâu: context chỉ cho auth (và theme nếu có).

### Role split (HV / GV)

- Route group: `(app)/` học viên · `(teacher)/` giáo viên (hoặc `/teacher/...`).
- Guard theo `user.role` từ auth — không tin UI ẩn nút là đủ (API vẫn check).

### Ví dụ (thư viện deck)

1. `app/(app)/library/vocab/page.tsx` render `<DeckList />`.
2. `features/library/DeckList.tsx` (client) gọi `listDecks()` từ `lib/api/decks.ts`.
3. Card dùng `components/ui/Badge` + màu DESIGN-SYSTEM.

### Không làm

- Nhét toàn bộ app vào `page.tsx` 500 dòng.
- Gọi `fetch(API_URL)` rải rác — luôn qua `lib/api`.
- Global store cho mọi list.
- Copy pattern admin UUP (marketplace, AI FAB) vào kiến trúc thư mục.

## Checklist bắt buộc (pre-delivery)

- [ ] Contrast chữ ≥ 4.5:1; focus ring rõ trên mọi control
- [ ] Icon SVG (không emoji); `cursor-pointer` trên phần tử click được
- [ ] Hover/transition 150–300ms; tôn trọng `prefers-reduced-motion`
- [ ] Touch target ≥ 44×44px trên mobile
- [ ] Responsive: 375 / 768 / 1024 / 1440
- [ ] Form: label thật (không chỉ placeholder); lỗi gần field
- [ ] Chart: legend + tooltip; không chỉ dựa vào màu

## Ưu tiên rule

1. Accessibility → 2. Touch/Interaction → 3. Performance cảm nhận → 4. Style nhất quán → 5. Layout responsive → 6. Typography/Color → 7. Motion có chủ đích → 8. Forms → 9. Navigation → 10. Charts

## Workflow ngắn

1. Xác định bề mặt (học viên / GV) và một job/section.
2. Đặt code đúng tầng (Architecture) + bám DESIGN-SYSTEM.
3. Ship checklist a11y + responsive trước khi coi là xong.

Chi tiết UI đầy đủ (styles, palettes): repo gốc `ui-ux-pro-max-skill`.
