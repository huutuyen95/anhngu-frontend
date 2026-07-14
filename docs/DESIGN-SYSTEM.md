# Design System — Anh ngữ (MVP)

> Cảm hứng từ site học viên [anhngumrsuyen.uup.vn/v3](https://anhngumrsuyen.uup.vn/v3)  
> **Không clone** balloon marketing, FAB “Luyện nói AI”, tin tức/marketplace.  
> Mục tiêu: app học nội bộ (HV + GV) nhìn quen brand, gọn hơn UUP.

Tham chiếu sản phẩm: `backend/docs/DESIGN-ADMIN-HOC-VIEN.md` · Skill UI: `frontend/docs/skills/anhngu-frontend-ui-ux/`.

---

## 1. Tính cách thương hiệu

| Thuộc tính | Mô tả |
|------------|--------|
| Tone | Học thuật, rõ ràng, thân thiện — không “startup purple” |
| Cảm giác | Navy + amber vàng ấm (logo / CTA nhấn) |
| Mật độ | Thoáng, card trắng trên nền xám rất nhạt |
| Motion | Nhẹ 150–300ms; không bounce / glow |

**Tránh:** gradient tím–indigo, dark mode mặc định, emoji-as-icon, hero marketing phình trên màn app.

---

## 2. Color tokens

Giá trị đo từ site gốc (`--color-global`, hex trong CSS).

### Brand

| Token | Hex | RGB | Dùng khi |
|-------|-----|-----|----------|
| `color.brand` / `--color-global` | `#002854` | `0, 40, 84` | Primary: nút chính, tab active, sidebar active, logo text |
| `color.brand-bold` | `#01162E` | | Hover / pressed primary |
| `color.accent` | `#F5AC3D` | | CTA phụ, highlight logo vàng, chip nhấn nhẹ |
| `color.accent-soft` | `#FFD966` | | Highlight rất nhẹ (badge / icon accent) |
| `color.tint` | `#F3FBFF` | | Nền khối nhấn rất nhạt (info strip) |

### Neutral

| Token | Hex | Dùng khi |
|-------|-----|----------|
| `color.bg` | `#F5F5F5` | Nền trang (`html` site gốc ≈ gray-50) |
| `color.surface` | `#FFFFFF` | Card, sidebar, header, form panel |
| `color.border` | `#E5E7EB` / gray-200 | Viền card, input, divider |
| `color.border-strong` | `#DCDFE6` | Input focus ring phụ |
| `color.text` | `#1F2937` / gần `#303133` | Tiêu đề, body chính |
| `color.text-secondary` | `#637381` | Meta, caption |
| `color.text-muted` | `#9197B3` | Placeholder, disabled hint |
| `color.text-on-brand` | `#FFFFFF` | Chữ trên nền navy |

### Semantic

| Token | Gợi ý | Dùng khi |
|-------|--------|----------|
| `color.success` | `#2F9E6F` / xanh “Miễn phí” | Badge miễn phí, đúng câu, done |
| `color.success-soft` | nền xanh rất nhạt + chữ xanh đậm | Chip trạng thái “Chưa làm” outline |
| `color.danger` | `#F56C6C` | Sai câu, lỗi form, destructive |
| `color.warning` | `#E6A23C` | Cảnh báo gần deadline |
| `color.info` | `#409EFF` | Info nhẹ (không thay brand) |

### CSS variables (gợi ý implement)

```css
:root {
  --color-brand: #002854;
  --color-brand-bold: #01162e;
  --color-accent: #f5ac3d;
  --color-accent-soft: #ffd966;
  --color-tint: #f3fbff;

  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-text: #1f2937;
  --color-text-secondary: #637381;
  --color-text-muted: #9197b3;

  --color-success: #2f9e6f;
  --color-danger: #f56c6c;
  --color-warning: #e6a23c;
}
```

Contrast: chữ trên `#002854` và `#F5AC3D` phải đạt ≥ 4.5:1 (amber chỉ dùng chữ đậm / icon, không chữ nhỏ xám trên amber).

---

## 3. Typography

| Token | Giá trị | Ghi chú |
|-------|---------|---------|
| Font family | **Quicksand**, sans-serif | Site gốc dùng Quicksand toàn app |
| Fallback | `system-ui, "Segoe UI", sans-serif` | |
| Base size | `16px` | body |
| Small | `12–14px` | meta, badge, tab mobile |
| Body | `14–16px` · weight 400–500 | |
| Title section | `18–20px` · weight 600–700 | “Nhiệm vụ”, “Bài viết” |
| Page title | `22–28px` · weight 700 | Login heading, intro đề |
| Button | `14–16px` · weight 600 | |

**Line-height:** ~1.5 body · ~1.3 title.  
**Tracking:** mặc định; không letter-spacing dày kiểu display.

Next.js: load Quicksand qua `next/font/google` (weights 400, 500, 600, 700).

---

## 4. Spacing & radius

Thang spacing 4px: `4 · 8 · 12 · 16 · 24 · 32 · 40 · 48`.

| Vùng | Padding gợi ý |
|------|----------------|
| Page content | 16–24px mobile · 24–32px desktop |
| Card | 16px |
| Form panel (login) | 32–40px |
| List row | 12–16px dọc |

| Token | Giá trị | Dùng |
|-------|---------|------|
| `radius.sm` | `4px` | icon button nhỏ |
| `radius.md` | `8px` | **nút**, input, tab pill ngắn |
| `radius.lg` | `12–16px` | card nội dung (`rounded-2xl` ≈ 16px trên site) |
| `radius.xl` | `20–24px` | panel login |
| `radius.full` | `9999px` | avatar, FAB (nếu có) |

---

## 5. Elevation & border

| Cấp | Style |
|-----|--------|
| Flat | `border: 1px solid var(--color-border)` — mặc định list/card |
| Hover card | `box-shadow: 0 8px 24px rgba(0,0,0,.08)` · transition 200ms |
| Modal / login | shadow nhẹ + radius xl |
| Không | multi-layer glow, shadow màu tím |

---

## 6. Layout shells

### Học viên (mobile-first)

```
┌─────────────────────────┐
│ Header: chào · logout   │
│ Content 1 cột           │
├─────────────────────────┤
│ Nhiệm vụ│Lớp│Thư viện│Báo cáo │  ← bottom nav ≤ 4
└─────────────────────────┘
```

- Nền `--color-bg`; content card trắng khi cần nhóm.
- Bottom nav: icon outline + label; **active = brand** (nền navy hoặc chữ navy + indicator).
- Desktop có thể dùng sidebar trái (như site gốc) + cùng token màu.

### Giáo viên (desktop-first)

```
┌──────────┬────────────────┐
│ Sidebar  │ Top bar        │
│ navy item│ Content        │
│ active   │                │
└──────────┴────────────────┘
```

- Sidebar surface trắng; item active nền `--color-brand`, chữ trắng.
- Không nhồi > 6 mục sidebar.

---

## 7. Components

### 7.1. Button

| Variant | Appearance |
|---------|------------|
| **Primary** | bg `--color-brand` · text white · radius 8 · h ~40–48 · font-semibold · hover `--color-brand-bold` |
| **Accent** | bg `--color-accent` · text `#1F2937` hoặc brand đậm · dùng sparingly (CTA vàng) |
| **Secondary / outline** | border brand hoặc success · bg white · dùng “Chưa làm”, filter inactive |
| **Ghost** | transparent · text secondary · hover bg gray-50 |
| **Danger** | bg/text danger |

Touch target ≥ 44×44px. Icon kèm text (vd “Làm ngay ›”).

### 7.2. Input

- Height ~40–44px · radius 8 · border gray · label phía trên (không chỉ placeholder).
- Focus: border/ring brand (`#002854`) 1–2px.
- Error: border danger + message dưới field.
- Password: icon mắt SVG bên phải.

### 7.3. Tabs / chips filter

- Inactive: bg white · border gray · text dark · radius 8.
- Active: bg `--color-brand` · text white (giống “Tất cả” trên site).
- Không dùng pill tím.

### 7.4. Badge / tag

| Loại | Style |
|------|--------|
| Skill / loại (Đề thi, Nghe…) | soft peach hoặc soft blue nền + chữ cùng hue |
| Miễn phí / success | nền xanh nhạt · chữ success |
| Accent meta (tin IELTS) | chữ `--color-accent` hoặc amber đậm |

### 7.5. Card

- bg white · radius 12–16 · border gray-100 hoặc shadow hover.
- List đề: hàng ngang `[thumb] [title + meta] [badge] [CTA]`.
- Grid tin/deck: ảnh trên · title · meta dưới (chỉ khi cần; MVP ít dùng tin tức).

### 7.6. List mission / “Làm ngay”

- Row trắng · border nhẹ · CTA primary nhỏ bên phải “Làm ngay”.
- Tag loại (Đề thi / Deck) soft color trái hoặc giữa.

### 7.7. Navigation

- **Bottom nav HV:** 4 mục; icon SVG (Lucide / Heroicons) — không Font Awesome Pro bắt buộc.
- **Sidebar GV / desktop HV:** logo trên · nav giữa · (optional) user dưới.
- Active state luôn brand navy.

### 7.8. Empty / loading

- Empty: 1 dòng giải thích + 1 CTA primary.
- Loading: skeleton xám nhạt hoặc spinner brand — không full-page balloon.

### 7.9. Login (MVP)

Có thể **đơn giản hơn** site gốc:

- Nền `--color-bg` hoặc tint rất nhạt — **không bắt buộc** balloon.
- Card trắng radius xl · primary button full-width navy.
- Chỉ email + mật khẩu (+ quên mật khẩu nếu có API).

---

## 8. Iconography

| Quy ước | Chi tiết |
|---------|----------|
| Style | Outline, stroke 1.5–2px, góc rounded |
| Size | 20–24px nav · 16px inline |
| Màu | kế thừa `currentColor` |
| Cấm | emoji thay icon |

---

## 9. Motion

| Tương tác | Duration | Easing |
|-----------|----------|--------|
| Hover bg / color | 150–200ms | ease |
| Shadow card | 200ms | ease |
| Modal | 200–300ms | ease-out |
| `prefers-reduced-motion: reduce` | tắt transform / chỉ đổi opacity tối thiểu | |

---

## 10. Trạng thái học / đề (semantic UI)

| State | UI |
|-------|-----|
| Chưa làm | outline success hoặc secondary + label |
| Đang làm | badge warning / brand soft |
| Đã nộp / Done | badge success |
| Đúng | xanh |
| Sai | đỏ + hiện `explanation` sau nộp |
| Timer | text secondary; < 5 phút → warning |

---

## 11. Responsive breakpoints

| Name | Min width | Ghi chú |
|------|-----------|---------|
| mobile | 375 | bottom nav; 1 cột |
| tablet | 768 | 2 cột grid khi cần |
| desktop | 1024 | sidebar + content |
| wide | 1440 | max content ~1200–1280 |

---

## 12. Ánh xạ Tailwind (gợi ý)

```js
// tailwind / @theme
colors: {
  brand: { DEFAULT: '#002854', bold: '#01162e' },
  accent: { DEFAULT: '#f5ac3d', soft: '#ffd966' },
  page: '#f5f5f5',
}
fontFamily: {
  sans: ['Quicksand', 'system-ui', 'sans-serif'],
}
```

Ví dụ class:

- Primary btn: `bg-brand hover:bg-brand-bold text-white font-semibold rounded-lg`
- Page: `bg-page text-gray-800`
- Card: `bg-white rounded-2xl border border-gray-100`

---

## 13. Checklist trước khi ship màn hình

- [ ] Dùng brand `#002854` / accent `#F5AC3D` — không tự invent purple
- [ ] Font Quicksand (hoặc đã thống nhất 1 sans)
- [ ] Contrast ≥ 4.5:1; focus ring rõ
- [ ] Touch ≥ 44px; icon SVG
- [ ] HV: ≤ 4 bottom nav; GV: sidebar gọn
- [ ] Không balloon / FAB AI / marketing trên màn học cốt lõi
- [ ] Responsive 375 / 768 / 1024

---

## 14. Phạm vi không đưa vào design system MVP

- Mascot astronaut / chat AI floating  
- Catalog tin tức & marketing hero lớn  
- Multi-language flag phức tạp (đủ 1 locale VI)  
- Theme dark mặc định  
- Element Plus blue `#409EFF` làm primary (chỉ giữ nếu cần link phụ — **primary app = navy**)
