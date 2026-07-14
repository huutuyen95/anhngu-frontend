# Design Guide — Anh Ngữ (Hiện đại, tối giản)

Kim chỉ nam để mọi trang trông nhất quán và "sạch". Dùng chung với shadcn/ui đã cài.

## Nguyên tắc

1. **Khoảng trắng là bạn.** Rộng rãi, thoáng. Padding lớn (`p-6`/`p-8`), khoảng cách section rõ.
2. **Ít màu, mạnh typography.** Màu dùng như điểm nhấn, không phủ khắp. Phân cấp chữ rõ ràng.
3. **Nhất quán.** Cùng bo góc, cùng bóng đổ, cùng cỡ icon, cùng nhịp khoảng cách trên mọi trang.
4. **Tối giản ≠ trống rỗng.** Có chi tiết tinh tế: hover nhẹ, viền mảnh, chuyển động mượt.

## Màu (đã map vào theme shadcn)

- **Primary — Navy `#0a2a5e`**: nút chính, tiêu đề nhấn, trạng thái active.
- **Accent — Xanh lá `#22a45d`**: thành công, badge "Đã làm", nhấn tích cực.
- Nền trắng / xám rất nhạt (`#f8fafc`). Muted xám (`#6b7280`) cho chữ phụ. Border xám nhạt.
- Dùng màu **có chủ đích**: 1 điểm nhấn/khu vực, tránh loè loẹt.

## Typography

- Font: Inter (hoặc mặc định Next). Chữ phụ dùng `text-muted-foreground`.
- Cấp bậc: tiêu đề trang `text-3xl font-bold`; tiêu đề khối `text-lg font-semibold`;
  body `text-sm`/`text-base`; chú thích `text-xs text-muted-foreground`.
- Line-height thoáng, không nhồi chữ.

## Bố cục

- Nội dung căn giữa, `max-w-6xl mx-auto`, padding hai bên.
- Sidebar gọn, mục active nền navy. Top bar (nếu có) mảnh, dính.
- Lưới thẻ responsive: 1 cột (mobile) → 2 → 3 cột (desktop), `gap-5/6`.

## Component (dùng shadcn)

- **Card**: `rounded-xl`, viền mảnh `border` hoặc `shadow-sm`, nền trắng. Hover: nhấc nhẹ
  (`hover:-translate-y-0.5 hover:shadow-md transition`).
- **Button**: shadcn `<Button>` — primary navy; secondary/ghost cho hành động phụ.
- **Badge**: trạng thái (xám = chưa, xanh lá = đã làm/hoàn thành).
- **Icon**: `lucide-react`, cỡ đồng nhất (`h-5 w-5`), đặt trong ô bo tròn nền màu nhạt.
- **Loading**: `<Skeleton>` thay vì chữ "Đang tải".
- **Toast**: `sonner` cho thông báo hành động.

## Chuyển động

- Transition 150–200ms, ease. Hover thẻ nhấc nhẹ. Không animation loè loẹt/gây phân tâm.

## Nên tránh

- Nhiều màu rực cùng lúc; bóng đổ nặng; góc bo quá tròn kiểu "bong bóng"; nhồi nhét dày đặc;
  dùng emoji thay icon ở khu vực nghiêm túc (dùng lucide cho gọn/nhất quán).