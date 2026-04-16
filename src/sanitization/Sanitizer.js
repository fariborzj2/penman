export class Sanitizer {
  constructor() {
    this.allowedTags = {
      p: [],
      div: ["class"],
      b: [],
      i: [],
      u: [],
      strong: [],
      em: [],
      a: ["href", "target", "rel"],
      ul: [],
      ol: [],
      li: [],
      br: [],
      span: ["style", "id"],
      hr: [],
      mark: [],
      s: [],
      strike: [],
      blockquote: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      figure: ["class", "data-alignment"],
      figcaption: ["class", "data-placeholder"],
      img: ["src", "alt", "width", "height", "data-id", "style"],
      table: ["border", "bordercolor", "style", "data-table-id"],
      thead: [],
      tbody: [],
      tfoot: [],
      tr: ["style"],
      th: ["rowspan", "colspan", "style", "data-cell-id"],
      td: ["rowspan", "colspan", "style", "data-cell-id"],
      caption: []
    };
  }

  sanitize(html) {
    if (!html) return "";

    const doc = new DOMParser().parseFromString(html, "text/html");
    const root = doc.body;

    this._sanitize(root);
    this._normalize(root);
    this._cleanup(root);

    return root.innerHTML;
  }

  /* ================= SANITIZE ================= */

  _sanitize(node) {
    const children = Array.from(node.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }

      const tag = child.tagName.toLowerCase();

      if (!this.allowedTags[tag]) {
        this._sanitize(child);

        const parent = child.parentNode;
        while (child.firstChild) {
          parent.insertBefore(child.firstChild, child);
        }

        child.remove();
        continue;
      }

      this._cleanAttributes(child, tag);
      this._sanitize(child);
    }
  }

  _cleanAttributes(el, tag) {
    const allowed = this.allowedTags[tag] || [];

    for (const attr of Array.from(el.attributes)) {
      if (!allowed.includes(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      } else if (attr.name.toLowerCase() === 'href') {
        const val = attr.value.replace(/\s/g, '').toLowerCase();
        if (val.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      }
    }
  }

  /* ================= NORMALIZATION ENGINE ================= */

  _normalize(root) {
    this._wrapOrphanText(root);
    this._removeEmptyInline(root);
    this._normalizeParagraphs(root);
    this._normalizeListItems(root);
    this._fixBreaks(root);
    this._deduplicateFigures(root);
    this._normalizeText(root);
  }

  /* Wrap raw/orphaned text and inline elements in paragraph */
  _wrapOrphanText(root) {
    const blockTags = new Set([
      "p", "div", "ul", "ol", "li", "blockquote",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "figure", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "caption", "figcaption"
    ]);

    let currentP = null;
    const children = Array.from(root.childNodes);

    for (const child of children) {
      const isElement = child.nodeType === Node.ELEMENT_NODE;
      const isText = child.nodeType === Node.TEXT_NODE;

      let isInline = false;
      if (isText) {
        isInline = true;
      } else if (isElement) {
        const tag = child.tagName.toLowerCase();
        if (!blockTags.has(tag)) {
          isInline = true;
        }
      }

      if (isInline) {
        const isPureWhitespace = isText && child.nodeValue.trim() === '';
        if (!currentP) {
          if (isPureWhitespace) {
            continue;
          }
          currentP = document.createElement("p");
          root.insertBefore(currentP, child);
        }
        currentP.appendChild(child);
      } else {
        currentP = null;
      }
    }
  }

  /* حذف inline خالی */
  _removeEmptyInline(root) {
    const inlineTags = ["span", "b", "i", "u", "strong", "em"];

    for (const tag of inlineTags) {
      const nodes = Array.from(root.querySelectorAll(tag));

      for (const el of nodes) {
        const hasContent =
          el.textContent.trim().length > 0 ||
          el.querySelector("img, br, hr");

        if (!hasContent) el.remove();
      }
    }
  }

  /* paragraph cleanup */
  _normalizeParagraphs(root) {
    const ps = Array.from(root.querySelectorAll("p"));

    for (const p of ps) {
      // remove empty <p>
      if (!p.textContent.trim() && !p.querySelector("img,br,hr")) {
        p.remove();
        continue;
      }

      // remove trailing br
      while (p.lastChild && p.lastChild.nodeName === "BR") {
        p.lastChild.remove();
      }
    }

    // merge consecutive empty p
    for (let i = 0; i < ps.length - 1; i++) {
      const a = ps[i];
      const b = ps[i + 1];

      if (a && b && !a.textContent.trim() && !b.textContent.trim()) {
        b.remove();
      }
    }
  }

  /* ================= IMPORTANT FIX ================= */

  /* لیست‌ها: رفتار br در li */
  _normalizeListItems(root) {
    const lis = Array.from(root.querySelectorAll("li"));

    for (const li of lis) {
      const brs = Array.from(li.querySelectorAll("br"));

      for (const br of brs) {
        const prev = br.previousSibling;
        const next = br.nextSibling;

        const hasTextBefore =
          prev &&
          prev.nodeType === Node.TEXT_NODE &&
          prev.textContent.trim().length > 0;

        const hasTextAfter =
          next &&
          next.nodeType === Node.TEXT_NODE &&
          next.textContent.trim().length > 0;

        // فقط br بین دو متن واقعی نگه داشته می‌شود
        if (!(hasTextBefore && hasTextAfter)) {
          br.remove();
        }
      }
    }
  }

  /* fix break structure */
  _fixBreaks(root) {
    const brs = Array.from(root.querySelectorAll("br"));

    for (const br of brs) {
      const parent = br.parentElement;

      if (parent?.tagName === "P" && parent.childNodes.length === 1) {
        br.remove();
      }

      if (br.nextSibling && br.nextSibling.nodeName === "BR") {
        br.remove();
      }
    }
  }

  /* duplicate figures/images */
  _deduplicateFigures(root) {
    const seen = new Set();
    const figures = Array.from(root.querySelectorAll("figure"));

    for (const fig of figures) {
      const img = fig.querySelector("img");
      const key = img?.src;

      if (key) {
        if (seen.has(key)) {
          fig.remove();
        } else {
          seen.add(key);
        }
      }
    }
  }

  /* normalize whitespace */
  _normalizeText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    let node;
    while ((node = walker.nextNode())) {
      // Allow whitespace
      node.nodeValue = node.nodeValue.replace(/\s{2,}/g, " ");
    }
  }

  /* ================= CLEANUP ================= */

  _cleanup(root) {
    this._removeEmptyTextNodes(root);
  }

  _removeEmptyTextNodes(node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!child.nodeValue.trim() && child.nodeValue !== " ") child.remove();
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        this._removeEmptyTextNodes(child);
      }
    }
  }
}