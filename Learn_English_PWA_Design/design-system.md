# Learn English — Design System (PWA)

Phong cách: thân thiện, "pillow UI" cho học sinh (tham khảo ảnh đính kèm) — nền kem, thẻ bo tròn lớn, bóng đổ đặc màu (solid shadow), màu pastel tươi. Khu Admin dùng cùng token nhưng mật độ cao hơn, ít trang trí hơn.

## 1. Màu sắc

### Nền & chữ
| Token | Giá trị | Dùng cho |
|---|---|---|
| `cream` | `#FBF7EA` | Nền toàn trang (cả Admin & Student) |
| `surface` | `#FFFFFF` | Card, bảng, modal, input |
| `ink` | `#3A3330` | Chữ chính, tiêu đề |
| `muted` | `#8A8073` | Chữ phụ, label, placeholder |
| `line` | `#EFE7D4` | Viền card, kẻ bảng |

### Màu chính (Primary — Cam)
| Token | Giá trị | Dùng cho |
|---|---|---|
| `orange-500` | `#F2793B` | Nút chính, tab active, link |
| `orange-600` | `#D65F27` | Bóng đổ đặc của nút, hover |
| `orange-100` | `#FDEBDD` | Nền chip/badge cam nhạt |

### Màu phụ (pastel — mỗi module 1 màu)
| Token | Đậm | Nhạt | Gán cho |
|---|---|---|---|
| `purple` | `#8C7DE6` | `#EFECFC` | Đề thi / Trắc nghiệm |
| `blue` | `#56C2EE` | `#E4F5FD` | Từ vựng |
| `green` | `#9CCC3C` | `#F1F8DE` | Đúng / Hoàn thành / Tài liệu |
| `yellow` | `#FFC94D` | `#FFF3D3` | Sao, streak, Writing, cảnh báo nhẹ |
| `red` | `#E5604C` | `#FDE7E2` | Sai, xoá, hết giờ (<5 phút) |

Quy tắc: tối đa 1–2 màu nền / màn hình; màu pastel chỉ dùng cho chip, số liệu, icon-tile — không tô mảng lớn.

## 2. Chữ (Typography)
Cả 2 font hỗ trợ đầy đủ tiếng Việt (Google Fonts).

| Vai trò | Font | Cỡ / weight |
|---|---|---|
| Display / tên màn | **Baloo 2** | 28–36px · 700 |
| Tiêu đề card, câu hỏi | Baloo 2 | 20–24px · 600 |
| Body | **Quicksand** | 15–16px · 500 |
| Label, meta, cột bảng | Quicksand | 12–13px · 700, uppercase +0.4px |
| Số liệu lớn (timer, stat) | Baloo 2 | 32–44px · 700 |

## 3. Hình khối
- **Bo góc:** card lớn 24px · card nhỏ/input 14px · nút & chip pill (999px) · thẻ đáp án 18px.
- **Bóng "pillow":** không dùng blur lớn — `box-shadow: 0 4px 0 <màu đậm hơn nền 1 nấc>` cho nút; card dùng `border: 1.5px solid line` + `0 2px 0 line`.
- **Khoảng cách:** thang 4px; padding card 20–24px; gap lưới 16–20px.

## 4. Thành phần
- **Nút chính:** nền `orange-500`, chữ trắng 700, pill, shadow đặc `orange-600`; nhấn = dịch xuống 2px. Cao 48px (Student) / 40px (Admin).
- **Nút phụ:** nền trắng, viền 1.5px `line`, chữ `ink`.
- **Input:** nền trắng, viền 1.5px `line`, radius 14px, cao 48px; focus viền `orange-500`.
- **Thẻ đáp án (quiz):** nền trắng, viền 1.5px, ô chữ cái A/B/C/D dạng tile 40px màu pastel (A tím, B vàng, C xanh lá, D xanh dương); chọn = viền + nền nhạt màu cam; đúng = xanh lá, sai = đỏ.
- **Toggle On/Off:** track 40×22, On = `green`, Off = `line`.
- **Chip trạng thái:** pill, nền nhạt + chữ đậm cùng tông (VD: Chờ chấm = vàng, Đã xong = xanh lá).
- **Bảng (Admin):** header nền `cream`, chữ label uppercase; hàng cao 56px, kẻ ngang `line`; hover nền `#FDFBF3`.
- **Sidebar (Admin & Student):** nền trắng, item active = pill nền `orange-100` chữ `orange-500`.
- **Timer quiz:** đồng hồ đếm ngược Baloo 2 40px trong card; còn <5 phút chuyển `red` + nền `red-nhạt`.
- **Lưới số câu:** ô 36px radius 10px — trắng viền = chưa làm · cam = đã trả lời · vàng = đánh dấu · viền cam dày = câu hiện tại.

## 5. Giọng văn (copy)
Student: thân thiện, động viên ("Cố lên!", "Làm bài nào!"). Admin: ngắn gọn, nghiệp vụ. Không dùng emoji trong khu Admin.
