/**
 * Default audit rules. Pure, deterministic, no AI.
 *
 * Each rule's user-visible strings are stored as i18n KEYS rather than literal
 * text — the AuditModal resolves them via `editor.i18n.t()` at render time so
 * the UI is fully bilingual (English / Persian / anything else added later).
 *
 * Rule contract:
 *   {
 *     id:        'kebab-case-id',
 *     category:  'seo' | 'accessibility' | ...,
 *     severity:  'critical' | 'warning' | 'suggestion',
 *     titleKey:  'plugins.audit.rules.<id>.title',
 *     descKey:   '... .desc',
 *     whyKey:    '... .why',
 *     fixKey:    '... .fix',
 *     autoFix:   optional (issue, editor) => void,
 *     detect:    (ctx) => Array<{ element, locKey?, locParams?, extra? }>
 *   }
 *
 * For dynamic location labels each issue returns:
 *   { element, locKey: 'plugins.audit.loc.someKey', locParams: { idx: 1 } }
 * The modal interpolates the parameters into the translated string.
 */

const WEAK_ANCHOR_PATTERNS = /^(click\s+here|here|read\s+more|more|link|this\s+link|اینجا|اینجا\s+کلیک|بیشتر|ادامه|اطلاعات\s+بیشتر)$/i;
const PLACEHOLDER_PATTERNS = /^(lorem ipsum|placeholder|tbd|todo|fixme)/i;

const txt = (el) => (el && el.textContent ? el.textContent.trim() : '');
const attr = (el, name) => (el && el.getAttribute ? (el.getAttribute(name) || '') : '');
const k = (id, slot) => `plugins.audit.rules.${id}.${slot}`;
const truncate = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

/** Helper to keep rule definitions compact — auto-generates the four i18n keys. */
const rule = (id, category, severity, detect, autoFix) => ({
  id,
  category,
  severity,
  titleKey: k(id, 'title'),
  descKey: k(id, 'desc'),
  whyKey: k(id, 'why'),
  fixKey: k(id, 'fix'),
  detect,
  autoFix,
});

// ─── SEO ──────────────────────────────────────────────────────────────────

const seoRules = [
  rule('seo-no-h1', 'seo', 'critical', (ctx) => {
    const h1 = ctx.root.querySelector('h1');
    if (h1) return [];
    return [{ element: null, locKey: 'plugins.audit.loc.topOfDoc' }];
  }),

  rule('seo-multiple-h1', 'seo', 'warning', (ctx) => {
    const h1s = Array.from(ctx.root.querySelectorAll('h1'));
    if (h1s.length <= 1) return [];
    return h1s.slice(1).map((el, idx) => ({
      element: el,
      locKey: 'plugins.audit.loc.headingN',
      locParams: { level: 'H1', n: idx + 2, text: truncate(txt(el), 60) || '—' },
    }));
  }),

  rule('seo-h1-too-long', 'seo', 'suggestion', (ctx) => {
    const issues = [];
    for (const h1 of ctx.root.querySelectorAll('h1')) {
      const len = txt(h1).length;
      if (len > 70) {
        issues.push({
          element: h1,
          locKey: 'plugins.audit.loc.charsCount',
          locParams: { tag: 'H1', count: len },
        });
      }
    }
    return issues;
  }),

  rule('seo-content-too-short', 'seo', 'warning', (ctx) => {
    if (ctx.stats.wordCount === 0 || ctx.stats.wordCount >= 100) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.wordsTotal',
      locParams: { count: ctx.stats.wordCount },
    }];
  }),

  rule('seo-no-images', 'seo', 'suggestion', (ctx) => {
    if (ctx.stats.wordCount < 500 || ctx.stats.imageCount > 0) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.wordsNoImages',
      locParams: { count: ctx.stats.wordCount },
    }];
  }),

  rule('seo-placeholder-text', 'seo', 'critical', (ctx) => {
    const issues = [];
    for (const p of ctx.paragraphs) {
      const t = txt(p);
      if (t && PLACEHOLDER_PATTERNS.test(t)) {
        issues.push({
          element: p,
          locKey: 'plugins.audit.loc.paragraphQuote',
          locParams: { text: truncate(t, 60) },
        });
      }
    }
    return issues;
  }),
];

// ─── ACCESSIBILITY ────────────────────────────────────────────────────────

const a11yRules = [
  rule('a11y-img-missing-alt', 'accessibility', 'critical', (ctx) => {
    return ctx.images
      .filter(img => !img.hasAttribute('alt'))
      .map((img, idx) => ({
        element: img,
        locKey: 'plugins.audit.loc.imageN',
        locParams: { n: idx + 1, src: truncate(attr(img, 'src'), 50) },
      }));
  }),

  rule('a11y-iframe-no-title', 'accessibility', 'warning', (ctx) => {
    return ctx.iframes
      .filter(f => !attr(f, 'title'))
      .map((f, idx) => ({
        element: f,
        locKey: 'plugins.audit.loc.iframeN',
        locParams: { n: idx + 1 },
      }));
  }),

  rule('a11y-empty-link', 'accessibility', 'critical', (ctx) => {
    return ctx.links
      .filter(a => !txt(a) && !attr(a, 'aria-label') && !a.querySelector('img[alt]'))
      .map((a, idx) => ({
        element: a,
        locKey: 'plugins.audit.loc.linkN',
        locParams: { n: idx + 1, href: truncate(attr(a, 'href'), 50) },
      }));
  }),

  rule('a11y-button-no-label', 'accessibility', 'warning', (ctx) => {
    const buttons = Array.from(ctx.root.querySelectorAll('button'));
    return buttons
      .filter(b => !txt(b) && !attr(b, 'aria-label'))
      .map((b, idx) => ({
        element: b,
        locKey: 'plugins.audit.loc.buttonN',
        locParams: { n: idx + 1 },
      }));
  }),

  rule('a11y-input-no-label', 'accessibility', 'warning', (ctx) => {
    const inputs = Array.from(ctx.root.querySelectorAll('input, select, textarea'));
    return inputs
      .filter(el => !attr(el, 'aria-label') && !attr(el, 'aria-labelledby'))
      .filter(el => !el.closest('label'))
      .filter(el => {
        const id = el.id;
        if (!id) return true;
        return !ctx.root.querySelector(`label[for="${typeof CSS !== 'undefined' ? CSS.escape(id) : id}"]`);
      })
      .map((el, idx) => ({
        element: el,
        locKey: 'plugins.audit.loc.tagN',
        locParams: { tag: el.tagName.toLowerCase(), n: idx + 1 },
      }));
  }),
];

// ─── READABILITY ──────────────────────────────────────────────────────────

const readabilityRules = [
  rule('read-long-paragraph', 'readability', 'warning', (ctx) => {
    return ctx.paragraphs
      .map(p => ({ el: p, words: txt(p).split(/\s+/).filter(Boolean).length }))
      .filter(x => x.words > 150)
      .map((x, idx) => ({
        element: x.el,
        locKey: 'plugins.audit.loc.paragraphWords',
        locParams: { n: idx + 1, count: x.words },
      }));
  }),

  rule('read-long-sentence', 'readability', 'suggestion', (ctx) => {
    const long = ctx.sentences.filter(s => s.split(/\s+/).filter(Boolean).length > 35);
    if (long.length === 0) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.longSentences',
      locParams: { count: long.length },
    }];
  }),

  rule('read-no-headings', 'readability', 'warning', (ctx) => {
    if (ctx.stats.wordCount < 400 || ctx.stats.headingCount > 0) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.wordsNoHeadings',
      locParams: { count: ctx.stats.wordCount },
    }];
  }),

  rule('read-no-lists', 'readability', 'suggestion', (ctx) => {
    if (ctx.stats.wordCount < 500 || ctx.stats.listCount > 0) return [];
    return [{ element: null, locKey: 'plugins.audit.loc.noLists' }];
  }),

  rule('read-repeated-word', 'readability', 'suggestion', (ctx) => {
    const issues = [];
    const seen = new Set();
    for (const p of ctx.paragraphs) {
      const t = txt(p);
      if (!t) continue;
      const m = t.match(/\b(\w+)\s+\1\b/gi);
      if (m) {
        for (const match of m) {
          const key = match.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          issues.push({
            element: p,
            locKey: 'plugins.audit.loc.repeatedWord',
            locParams: { word: match },
          });
          if (issues.length >= 5) return issues;
        }
      }
    }
    return issues;
  }),

  rule('read-keyword-density', 'readability', 'suggestion', (ctx) => {
    if (ctx.stats.wordCount < 100) return [];
    const counts = new Map();
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'to', 'is', 'are',
      'was', 'were', 'be', 'for', 'with', 'as', 'at', 'on', 'by', 'this',
      'that', 'it', 'from',
      'و', 'در', 'به', 'از', 'با', 'این', 'آن', 'یک', 'را', 'که', 'تا', 'هم'
    ]);
    for (const w of ctx.words) {
      const kk = w.toLowerCase().replace(/[^\p{L}]/gu, '');
      if (!kk || stopwords.has(kk) || kk.length < 4) continue;
      counts.set(kk, (counts.get(kk) || 0) + 1);
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 1);
    if (!top.length) return [];
    const [word, count] = top[0];
    const density = count / ctx.stats.wordCount;
    if (density < 0.06) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.wordDensity',
      locParams: { word, count, pct: Math.round(density * 100) },
    }];
  }),
];

// ─── STRUCTURE / HEADINGS ─────────────────────────────────────────────────

const structureRules = [
  rule('struct-heading-skip', 'structure', 'warning', (ctx) => {
    const issues = [];
    let prevLevel = 0;
    for (const h of ctx.headings) {
      const level = parseInt(h.tagName.substring(1), 10);
      if (prevLevel && level > prevLevel + 1) {
        issues.push({
          element: h,
          locKey: 'plugins.audit.loc.headingSkip',
          locParams: { from: prevLevel, to: level, text: truncate(txt(h), 50) || '—' },
        });
      }
      prevLevel = level;
    }
    return issues;
  }),

  rule('struct-empty-heading', 'structure', 'warning', (ctx) => {
    return ctx.headings
      .filter(h => !txt(h))
      .map(h => ({
        element: h,
        locKey: 'plugins.audit.loc.emptyHeading',
        locParams: { tag: h.tagName },
      }));
  }),

  rule('struct-duplicate-heading', 'structure', 'suggestion', (ctx) => {
    const seen = new Map();
    const dups = [];
    for (const h of ctx.headings) {
      const t = txt(h).toLowerCase();
      if (!t) continue;
      if (seen.has(t)) {
        dups.push({
          element: h,
          locKey: 'plugins.audit.loc.duplicateHeading',
          locParams: { text: truncate(txt(h), 50) },
        });
      } else {
        seen.set(t, h);
      }
    }
    return dups;
  }),
];

// ─── MEDIA ────────────────────────────────────────────────────────────────

const mediaRules = [
  rule('media-img-no-dimensions', 'media', 'suggestion', (ctx) => {
    return ctx.images
      .filter(img => !img.hasAttribute('width') || !img.hasAttribute('height'))
      .map((img, idx) => ({
        element: img,
        locKey: 'plugins.audit.loc.imageN',
        locParams: { n: idx + 1, src: truncate(attr(img, 'src'), 50) },
      }));
  }),

  rule('media-img-no-lazy', 'media', 'suggestion', (ctx) => {
    return ctx.images
      .filter(img => !attr(img, 'loading'))
      .map((img, idx) => ({
        element: img,
        locKey: 'plugins.audit.loc.imageOnly',
        locParams: { n: idx + 1 },
      }));
  }, (issue) => { if (issue.element) issue.element.setAttribute('loading', 'lazy'); }),

  rule('media-duplicate-alt', 'media', 'suggestion', (ctx) => {
    const map = new Map();
    const dups = [];
    for (const img of ctx.images) {
      const alt = attr(img, 'alt');
      if (!alt) continue;
      if (map.has(alt)) {
        dups.push({
          element: img,
          locKey: 'plugins.audit.loc.duplicateAlt',
          locParams: { alt: truncate(alt, 50) },
        });
      } else {
        map.set(alt, img);
      }
    }
    return dups;
  }),
];

// ─── LINKS ────────────────────────────────────────────────────────────────

// Detect whitespace, malformed schemes, invalid hostnames, and other
// structural problems with a URL. Returns true when the URL looks broken.
function _isMalformedURL(href) {
  if (!href) return false;

  // Special-purpose schemes the rule should not second-guess.
  if (href === '#' || /^(mailto|tel|sms|javascript):/i.test(href)) return false;

  // Pure fragment / relative paths are fine.
  if (href.startsWith('#') || href.startsWith('/') ||
      href.startsWith('./') || href.startsWith('../')) {
    return false;
  }

  // 1. Any whitespace inside a URL is illegal — spaces, tabs, newlines.
  if (/\s/.test(href)) return true;

  // 2. If the URL declares an http/https/ftp scheme it MUST be followed by
  //    "://". Things like "http:/x" or "https:example.com" are broken.
  const schemeMatch = href.match(/^([a-z][a-z0-9+.\-]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (['http', 'https', 'ftp', 'ftps', 'ws', 'wss'].includes(scheme)) {
      if (!new RegExp('^' + scheme + '://', 'i').test(href)) return true;
    }
  }

  // 3. Try parsing the URL. If the URL parser refuses, it is broken.
  let url;
  try {
    // Provide a base so relative URLs (already filtered above) don't trip it.
    url = new URL(href, 'http://placeholder.invalid');
  } catch (_) {
    return true;
  }

  // 4. Validate the hostname. Skip relative URLs (URL replaced the host with
  //    the placeholder), but for absolute URLs the host must look real.
  if (schemeMatch) {
    const host = url.hostname || '';

    // No dot at all (e.g. "http://localhost-only-no-dot") is suspicious unless
    // it is the literal "localhost" or an IPv4/IPv6 address.
    if (!host) return true;
    if (host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !host.includes('.') && !host.startsWith('[')) {
      return true;
    }

    // Each DNS label must be 1–63 chars, contain only [a-z0-9-], and may NOT
    // start or end with a hyphen. The user's example
    // ("example-broken-link-") trips on the trailing hyphen.
    const labels = host.split('.');
    for (const label of labels) {
      if (label.startsWith('[')) continue; // IPv6 in brackets
      if (label.length === 0 || label.length > 63) return true;
      if (/^-|-$/.test(label)) return true;
      if (!/^[a-z0-9-]+$/i.test(label) && !/^[a-z0-9¡-￿-]+$/i.test(label)) return true;
    }
  }

  return false;
}

const linkRules = [
  rule('link-malformed', 'links', 'critical', (ctx) => {
    return ctx.links
      .filter(a => _isMalformedURL(attr(a, 'href')))
      .map(a => ({
        element: a,
        locKey: 'plugins.audit.loc.brokenLink',
        locParams: { url: truncate(attr(a, 'href'), 60) || '—' },
      }));
  }),

  rule('link-empty-href', 'links', 'critical', (ctx) => {
    return ctx.links
      .filter(a => {
        const h = attr(a, 'href');
        return !h || h === '#';
      })
      .map((a, idx) => ({
        element: a,
        locKey: 'plugins.audit.loc.linkText',
        locParams: { n: idx + 1, text: truncate(txt(a), 50) || '—' },
      }));
  }),

  rule('link-http', 'links', 'warning', (ctx) => {
    return ctx.links
      .filter(a => /^http:\/\//i.test(attr(a, 'href')))
      .map(a => ({
        element: a,
        locKey: 'plugins.audit.loc.url',
        locParams: { url: truncate(attr(a, 'href'), 60) },
      }));
  }),

  rule('link-weak-anchor', 'links', 'suggestion', (ctx) => {
    return ctx.links
      .filter(a => WEAK_ANCHOR_PATTERNS.test(txt(a)))
      .map(a => ({
        element: a,
        locKey: 'plugins.audit.loc.weakAnchor',
        locParams: { text: txt(a), href: truncate(attr(a, 'href'), 40) },
      }));
  }),

  rule('link-duplicate', 'links', 'suggestion', (ctx) => {
    const seen = new Map();
    const dups = [];
    for (const a of ctx.links) {
      const key = `${attr(a, 'href')}|${txt(a)}`;
      if (seen.has(key)) {
        dups.push({
          element: a,
          locKey: 'plugins.audit.loc.duplicateLink',
          locParams: { text: truncate(txt(a), 40) },
        });
      } else {
        seen.set(key, a);
      }
    }
    return dups;
  }),

  rule('link-external-no-rel', 'links', 'suggestion', (ctx) => {
    return ctx.externalLinks
      .filter(a => attr(a, 'target') === '_blank' && !/noopener/i.test(attr(a, 'rel')))
      .map(a => ({
        element: a,
        locKey: 'plugins.audit.loc.url',
        locParams: { url: truncate(attr(a, 'href'), 60) },
      }));
  }, (issue) => {
    if (issue.element) issue.element.setAttribute('rel', 'noopener noreferrer');
  }),
];

// ─── PERFORMANCE ──────────────────────────────────────────────────────────

const performanceRules = [
  rule('perf-large-images', 'performance', 'suggestion', (ctx) => {
    if (ctx.stats.imageCount <= 10) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.imagesOnPage',
      locParams: { count: ctx.stats.imageCount },
    }];
  }),

  rule('perf-html-bloat', 'performance', 'suggestion', (ctx) => {
    if (ctx.stats.htmlLength < 1000 || ctx.stats.textToHtmlRatio >= 25) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.htmlRatio',
      locParams: { pct: ctx.stats.textToHtmlRatio },
    }];
  }),
];

// ─── HTML QUALITY ─────────────────────────────────────────────────────────

const htmlRules = [
  rule('html-empty-elements', 'html', 'suggestion', (ctx) => {
    const candidates = Array.from(ctx.root.querySelectorAll('strong, em, b, i, u, span, mark'));
    return candidates
      .filter(el => !el.textContent.trim() && !el.querySelector('img, br, hr'))
      .slice(0, 10)
      .map((el, idx) => ({
        element: el,
        locKey: 'plugins.audit.loc.tagN',
        locParams: { tag: el.tagName.toLowerCase(), n: idx + 1 },
      }));
  }, (issue) => {
    if (issue.element && issue.element.parentNode) issue.element.parentNode.removeChild(issue.element);
  }),

  rule('html-excessive-inline-style', 'html', 'suggestion', (ctx) => {
    const withStyle = Array.from(ctx.root.querySelectorAll('[style]'));
    if (withStyle.length <= 8) return [];
    return [{
      element: null,
      locKey: 'plugins.audit.loc.inlineStyleCount',
      locParams: { count: withStyle.length },
    }];
  }),

  rule('html-nested-same-tag', 'html', 'suggestion', (ctx) => {
    const issues = [];
    ['strong', 'em', 'b', 'i', 'u'].forEach(tag => {
      const nested = Array.from(ctx.root.querySelectorAll(`${tag} ${tag}`));
      nested.slice(0, 5).forEach(el => {
        issues.push({
          element: el,
          locKey: 'plugins.audit.loc.nestedSameTag',
          locParams: { tag },
        });
      });
    });
    return issues;
  }),
];

// ─── SECURITY ─────────────────────────────────────────────────────────────

const securityRules = [
  rule('sec-inline-event', 'security', 'critical', (ctx) => {
    const issues = [];
    const all = ctx.root.querySelectorAll('*');
    for (const el of all) {
      const onAttrs = Array.from(el.attributes).filter(a => a.name.toLowerCase().startsWith('on'));
      if (onAttrs.length === 0) continue;
      issues.push({
        element: el,
        locKey: 'plugins.audit.loc.tagWithAttrs',
        locParams: { tag: el.tagName.toLowerCase(), attrs: onAttrs.map(a => a.name).join(' ') },
      });
    }
    return issues;
  }, (issue) => {
    if (!issue.element) return;
    Array.from(issue.element.attributes).forEach(a => {
      if (a.name.toLowerCase().startsWith('on')) issue.element.removeAttribute(a.name);
    });
  }),

  rule('sec-javascript-href', 'security', 'critical', (ctx) => {
    return ctx.links
      .filter(a => /^\s*javascript:/i.test(attr(a, 'href')))
      .map(a => ({
        element: a,
        locKey: 'plugins.audit.loc.url',
        locParams: { url: truncate(attr(a, 'href'), 60) },
      }));
  }),

  rule('sec-iframe-unsafe-src', 'security', 'warning', (ctx) => {
    return ctx.iframes
      .filter(f => {
        const src = attr(f, 'src');
        return src && !/^https:\/\//i.test(src) && !/^\/\//.test(src);
      })
      .map(f => ({
        element: f,
        locKey: 'plugins.audit.loc.url',
        locParams: { url: truncate(attr(f, 'src'), 60) },
      }));
  }),
];

// ─── EXPORT ────────────────────────────────────────────────────────────────

export const defaultRules = [
  ...seoRules,
  ...a11yRules,
  ...readabilityRules,
  ...structureRules,
  ...mediaRules,
  ...linkRules,
  ...performanceRules,
  ...htmlRules,
  ...securityRules,
];

export const CATEGORY_META = {
  seo:           { labelKey: 'plugins.audit.categories.seo',           order: 1 },
  accessibility: { labelKey: 'plugins.audit.categories.accessibility', order: 2 },
  readability:   { labelKey: 'plugins.audit.categories.readability',   order: 3 },
  structure:     { labelKey: 'plugins.audit.categories.structure',     order: 4 },
  media:         { labelKey: 'plugins.audit.categories.media',         order: 5 },
  links:         { labelKey: 'plugins.audit.categories.links',         order: 6 },
  performance:   { labelKey: 'plugins.audit.categories.performance',   order: 7 },
  html:          { labelKey: 'plugins.audit.categories.html',          order: 8 },
  security:      { labelKey: 'plugins.audit.categories.security',      order: 9 },
};
