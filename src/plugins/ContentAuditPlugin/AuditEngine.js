/**
 * AuditEngine
 *
 * Rule-based, deterministic content audit engine. Accepts a list of rules and
 * runs them against a parsed editor DOM. Rules are pure functions that take a
 * context object and return zero or more issue descriptors.
 *
 * No AI, no network, no external dependencies.
 *
 * Rule contract:
 *   {
 *     id:            'kebab-case-id',
 *     category:      'seo' | 'accessibility' | 'readability' | 'structure' |
 *                    'media' | 'links' | 'performance' | 'html' | 'security',
 *     severity:      'critical' | 'warning' | 'suggestion',
 *     title:         string,
 *     description:   string,
 *     why:           string,           // why it matters
 *     fixSuggestion: string,           // human-readable fix
 *     autoFix:       (issue, editor) => void  | undefined,
 *     detect:        (context) => Array<Partial<Issue>>
 *   }
 *
 * Issue descriptor (returned from detect):
 *   {
 *     element:        HTMLElement | null,    // element to scroll/flash
 *     locationLabel:  string,                // human-readable location
 *     extra:          string                 // optional extra detail
 *   }
 */

export class AuditEngine {
  constructor(rules = []) {
    this.rules = rules.slice();
  }

  /**
   * Add a rule at runtime.
   */
  register(rule) {
    this.rules.push(rule);
  }

  /**
   * Runs every rule against the supplied root element and aggregates the
   * results into an AuditReport.
   *
   * @param {HTMLElement} root - typically editor.editableArea
   * @returns {AuditReport}
   */
  analyze(root) {
    const context = this._buildContext(root);
    const issues = [];

    for (const rule of this.rules) {
      let found = [];
      try {
        found = rule.detect(context) || [];
      } catch (_err) {
        // Bad rule should never crash the audit. Skip it silently.
        found = [];
      }
      for (const partial of found) {
        issues.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          // i18n keys — resolved by AuditModal at render time
          titleKey: rule.titleKey,
          descKey: rule.descKey,
          whyKey: rule.whyKey,
          fixKey: rule.fixKey,
          autoFix: typeof rule.autoFix === 'function' ? rule.autoFix : null,
          element: null,
          locKey: '',
          locParams: {},
          extra: '',
          ...partial,
        });
      }
    }

    const score = this._scoreFor(issues);
    return {
      score,
      labelKey: this._labelKeyFor(score),  // i18n key — modal translates
      stats: context.stats,
      categoryScores: this._categoryScores(issues),
      categoryCounts: this._categoryCounts(issues),
      issues,
      issuesByCategory: this._groupByCategory(issues),
    };
  }

  // ── Context ──────────────────────────────────────────────────────────────

  _buildContext(root) {
    const rawText = (root.textContent || '').replace(/ /g, ' ').trim();
    const words = rawText ? rawText.split(/\s+/).filter(Boolean) : [];
    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const paragraphs = Array.from(root.querySelectorAll('p'));
    const images = Array.from(root.querySelectorAll('img'));
    const links = Array.from(root.querySelectorAll('a'));
    const iframes = Array.from(root.querySelectorAll('iframe'));
    const lists = Array.from(root.querySelectorAll('ul, ol'));
    const htmlLength = (root.innerHTML || '').length;
    const textLength = rawText.length;

    const isExternal = (href) => /^https?:\/\//i.test(href);
    const isHttp = (href) => /^http:\/\//i.test(href);
    const isInternal = (href) => href && !isExternal(href);

    const internalLinks = links.filter(a => isInternal(a.getAttribute('href') || ''));
    const externalLinks = links.filter(a => isExternal(a.getAttribute('href') || ''));

    return {
      root,
      text: rawText,
      words,
      sentences: this._splitSentences(rawText),
      headings,
      paragraphs,
      images,
      links,
      iframes,
      lists,
      internalLinks,
      externalLinks,
      stats: {
        wordCount: words.length,
        readingMinutes: Math.max(1, Math.round(words.length / 200)),
        headingCount: headings.length,
        paragraphCount: paragraphs.length,
        imageCount: images.length,
        linkCount: links.length,
        internalLinkCount: internalLinks.length,
        externalLinkCount: externalLinks.length,
        listCount: lists.length,
        textLength,
        htmlLength,
        textToHtmlRatio: htmlLength > 0 ? Math.round((textLength / htmlLength) * 100) : 0,
      },
      utils: { isExternal, isInternal, isHttp },
    };
  }

  _splitSentences(text) {
    if (!text) return [];
    // Split on sentence terminators in Latin and Persian/Arabic. Keep it
    // intentionally lightweight — we just need rough counts for readability.
    return text
      .split(/(?<=[.!?؟。!?])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // ── Scoring ──────────────────────────────────────────────────────────────

  _scoreFor(issues) {
    const weights = { critical: 15, warning: 8, suggestion: 3 };
    let score = 100;
    for (const issue of issues) {
      score -= weights[issue.severity] || 0;
    }
    return Math.max(0, Math.min(100, score));
  }

  _categoryScores(issues) {
    const cats = new Set(issues.map(i => i.category));
    const out = {};
    for (const c of cats) {
      out[c] = this._scoreFor(issues.filter(i => i.category === c));
    }
    return out;
  }

  _categoryCounts(issues) {
    const out = {};
    for (const i of issues) {
      const c = i.category;
      if (!out[c]) out[c] = { critical: 0, warning: 0, suggestion: 0, total: 0 };
      out[c][i.severity] = (out[c][i.severity] || 0) + 1;
      out[c].total += 1;
    }
    return out;
  }

  _groupByCategory(issues) {
    const out = {};
    for (const i of issues) {
      if (!out[i.category]) out[i.category] = [];
      out[i.category].push(i);
    }
    return out;
  }

  _labelKeyFor(score) {
    if (score >= 90) return 'plugins.audit.quality.excellent';
    if (score >= 75) return 'plugins.audit.quality.good';
    if (score >= 60) return 'plugins.audit.quality.fair';
    if (score >= 40) return 'plugins.audit.quality.weak';
    return 'plugins.audit.quality.poor';
  }
}
