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

/** Thẻ kết thúc một khối / xuống dòng → đổi thành "\n" trước khi bóc thẻ. */
const BLOCK_BREAK = /<\/(?:p|div|li|h[1-6]|blockquote|tr|pre)\s*>|<br\s*\/?>/gi;

const NAMED_ENTITY: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

/**
 * Giải mã entity — CHỈ dùng cho nhánh regex (không có DOM). Nhánh DOM đã tự giải
 * mã qua `textContent`, chạy thêm ở đó sẽ giải mã 2 lần ("&amp;lt;" → "<").
 */
function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const hex = body[1] === "x" || body[1] === "X";
      const code = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITY[body.toLowerCase()] ?? match;
  });
}

function tidyText(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Bóc HTML về text thuần — dùng khi HIỂN THỊ bài viết của học sinh: tiptap lưu
 * `answer_text` dạng HTML ("<p>…</p>"), in thẳng ra là lòi thẻ. Giữ ngắt dòng
 * giữa các khối, không giữ định dạng.
 *
 * Đây là hàm cho text hiển thị, KHÔNG phải để nhúng lại vào DOM.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const withBreaks = html.replace(BLOCK_BREAK, "\n");

  // SSR không có DOM: bóc thẻ bằng regex. Text thật chỉ render ở client nên đây
  // chỉ là đường lui, không phải đường chính.
  if (typeof document === "undefined") {
    return tidyText(decodeEntities(withBreaks.replace(/<[^>]*>/g, "")));
  }

  // Sanitize trước khi gán innerHTML — chuỗi này do học sinh nhập, không tin được.
  const el = document.createElement("div");
  el.innerHTML = DOMPurify.sanitize(withBreaks);
  return tidyText(el.textContent ?? "");
}
