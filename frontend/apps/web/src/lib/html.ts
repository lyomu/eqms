const ALLOWED_TAGS = new Set([
  "P", "BR", "DIV", "SPAN", "STRONG", "B", "EM", "I", "U", "S",
  "UL", "OL", "LI", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
  "A", "HR", "H2", "H3",
]);

const SAFE_URL = /^(https?:|mailto:)/i;

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node: Node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement;
      if (!ALLOWED_TAGS.has(element.tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }
      Array.from(element.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (name.startsWith("on") || name === "style" || name === "class") {
          element.removeAttribute(attr.name);
          return;
        }
        if (element.tagName === "A" && name === "href" && SAFE_URL.test(value)) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
          return;
        }
        element.removeAttribute(attr.name);
      });
      sanitizeNode(element);
    } else if (child.nodeType !== Node.TEXT_NODE) {
      child.remove();
    }
  });
}
