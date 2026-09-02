import { escapeHtml } from "./html";

/**
 * Small, safe Markdown → HTML for blog posts. Everything is HTML-escaped first,
 * then a fixed set of block/inline rules re-inserts known-good tags — so even
 * though posts are admin-authored, no raw HTML or `javascript:` URL survives.
 * Body headings start at <h2> (the page title owns the single <h1>).
 */
function inline(text: string): string {
  // Images: ![alt](src) — handled before links so the [] isn't taken as a link.
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    if (!/^(https?:\/\/|\/|data:image\/)/i.test(src.trim())) return "";
    return `<img src="${src.trim()}" alt="${alt}" loading="lazy" />`;
  });
  // Links: [label](url) — only http(s), root-relative, anchor, or mailto pass.
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const href = url.trim();
    if (!/^(https?:\/\/|\/|#|mailto:)/i.test(href)) return label;
    const external = /^https?:\/\//i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : "";
    return `<a href="${href}"${attrs}>${label}</a>`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  return text;
}

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let para: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCode = false;
  let code: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        html.push(`<pre><code>${code.join("\n")}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushPara();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }

    const t = line.trim();
    if (!t) {
      flushPara();
      flushList();
      continue;
    }

    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      const lvl = Math.min(h[1].length + 1, 5);
      html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) {
      flushPara();
      flushList();
      html.push("<hr />");
      continue;
    }
    if (/^&gt;\s?/.test(t)) {
      flushPara();
      flushList();
      html.push(`<blockquote>${inline(t.replace(/^&gt;\s?/, ""))}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      flushPara();
      if (listType !== "ul") {
        flushList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inline(t.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(t)) {
      flushPara();
      if (listType !== "ol") {
        flushList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inline(t.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    flushList();
    para.push(t);
  }

  flushPara();
  flushList();
  if (inCode) html.push(`<pre><code>${code.join("\n")}</code></pre>`);
  return html.join("\n");
}
