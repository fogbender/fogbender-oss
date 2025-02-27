import DOMPurify from "dompurify";
import { rehype } from "rehype";
import rehypeHighlight from "rehype-highlight";

export const sanitize = (text: string) => {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [
      "p",
      "b",
      "i",
      "br",
      "strong",
      "em",
      "pre",
      "code",
      "a",
      "blockquote",
      "sup",
      "hr",
      "s",
      "ul",
      "ol",
      "li",
      "table",
      "th",
      "tr",
      "td",
      "caption",
      "colgroup",
      "col",
      "thead",
      "tbody",
      "tfoot",
    ],
    ALLOWED_ATTR: ["href", "target", "class"],
    ALLOW_DATA_ATTR: false,
  });
};

export const toFinalHtml = (sanitized: string) => {
  return String(
    rehype()
      .data("settings", { fragment: true })
      .use(rehypeHighlight, { detect: true })
      .processSync(sanitized)
  );
};
