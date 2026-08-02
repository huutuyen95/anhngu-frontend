import DOMPurify from "isomorphic-dompurify";

/**
 * Làm sạch HTML tài liệu ở phía client (lớp phòng thủ 2 — server đã sanitize khi lưu).
 * Cho phép thẻ định dạng cơ bản + iframe YouTube nhúng.
 */
export function cleanDocHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
  });
}
