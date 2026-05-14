/**
 * AuditModal — renders the Content Audit Report inside an editor.ui modal.
 *
 * Pure DOM (no framework). Receives a live AuditReport from AuditEngine and
 * paints it into the modal body. Re-paints on every `report` update so the
 * caller can wire it to the editor's debounced `change` stream for real-time
 * analysis.
 */

import { CATEGORY_META } from './rules.js';
import { LinkChecker } from './linkChecker.js';

// ─── Icons (inline SVG) ────────────────────────────────────────────────────

const ICONS = {
  chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>',
  critical: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  suggestion: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  audit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h8"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>',
  seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  accessibility: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M5 9h14M9 22l3-12 3 12M8 13l4 2 4-2"/></svg>',
  readability: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  structure: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  media: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  links: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  performance: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>',
  security: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

const SEVERITY_ICON_MAP = {
  critical: ICONS.critical,
  warning: ICONS.warning,
  suggestion: ICONS.suggestion,
};

const escapeHtml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// ─── Class ─────────────────────────────────────────────────────────────────

export class AuditModal {
  /**
   * @param {Editor} editor - Penman editor instance
   * @param {AuditEngine} engine
   */
  constructor(editor, engine) {
    this.editor = editor;
    this.engine = engine;
    this.modal = null;
    this._auditRoot = null;
    this._openCategories = new Set(); // category ids that should stay open across re-renders
    this._destroyed = false;
    this._unbindChange = null;
    this._debounceTimer = null;

    // Async link-status state. The LinkChecker is per-modal so the cache
    // resets when the user closes the modal — keeps memory bounded.
    const opts = editor.options || {};
    this._checkLinks = opts.auditCheckLinks !== false; // default: ON
    this._linkChecker = new LinkChecker({
      proxyUrl: opts.auditLinkCheckProxy || null,
      timeout: opts.auditLinkCheckTimeout || 6000,
      concurrency: opts.auditLinkCheckConcurrency || 4,
    });
    this._linkStatus = new Map();  // href → result
    this._linkCheckSeq = 0;        // increments on each render to abort stale callbacks
    this._linksTotal = 0;
    this._linksDone = 0;
  }

  /**
   * Tiny i18n shortcut bound to this editor's locale. Returns the key itself
   * as a last-resort fallback (matches I18nManager behaviour).
   */
  t(key, params = {}) {
    return this.editor.i18n.t(key, params);
  }

  open() {
    if (this.modal) return;

    const container = document.createElement('div');
    container.className = 'penman-audit';
    // Apply the current i18n direction so right-aligned UI elements stay
    // visually consistent when the editor is in RTL mode.
    container.setAttribute('dir', this.editor.i18n.dir || 'ltr');
    this._auditRoot = container;

    this.modal = this.editor.ui.createModal({
      title: `${ICONS.audit} ${this.t('plugins.audit.title')}`,
      width: 'min(960px, 96vw)',
      hideFooter: true,
      body: '',
      onCancel: () => this._teardown(),
    });

    // Place audit container into modal body, replacing body content
    const body = this.modal.modalElement.querySelector('.penman-modal-body');
    if (body) {
      body.innerHTML = '';
      body.appendChild(container);
    }
    this.modal.modalElement.classList.add('penman-audit-modal');
    // Mark the overlay too so the responsive CSS can flip it into a
    // full-screen sheet on mobile without needing :has() support.
    if (this.modal.overlay) {
      this.modal.overlay.classList.add('penman-audit-overlay');
    }

    // Initial render
    this._render();

    // Re-render on every editor change, debounced.
    const onChange = () => {
      if (this._destroyed) return;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this._render(), 350);
    };
    this.editor.on('change', onChange);
    this._unbindChange = () => this.editor.off && this.editor.off('change', onChange);
  }

  close() {
    if (this.modal) this.modal.close();
    this._teardown();
  }

  _teardown() {
    this._destroyed = true;
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (this._unbindChange) {
      try { this._unbindChange(); } catch (_) { /* noop */ }
      this._unbindChange = null;
    }
    this._auditRoot = null;
    this.modal = null;
  }

  // ── Render ───────────────────────────────────────────────────────────

  _render() {
    if (!this._auditRoot) return;
    const report = this.engine.analyze(this.editor.editableArea);

    // Merge in any async link-status issues already collected from the
    // background HTTP checker so the user sees them after subsequent renders.
    this._mergeLinkStatusIssues(report);

    const hero = this._renderHero(report);
    const body = this._renderBody(report);

    this._auditRoot.innerHTML = '';
    this._auditRoot.appendChild(hero);
    this._auditRoot.appendChild(body);

    // Kick off (or refresh) async HTTP checks for every link in the editor.
    if (this._checkLinks) this._beginLinkChecks();
  }

  /**
   * Walks editable area links and fires HEAD requests through the LinkChecker.
   * Each completion stores its result and triggers a soft re-render (without
   * re-running the engine's sync rules — they're already up to date).
   */
  _beginLinkChecks() {
    const seq = ++this._linkCheckSeq;
    const links = Array.from(
      this.editor.editableArea.querySelectorAll('a[href]')
    ).filter(a => /^https?:\/\//i.test(a.getAttribute('href') || ''));

    // Deduplicate by href; we still keep the original element refs so the
    // "click an issue to scroll" feature highlights the actual node.
    const byHref = new Map();
    for (const a of links) {
      const href = a.getAttribute('href');
      if (!byHref.has(href)) byHref.set(href, []);
      byHref.get(href).push(a);
    }

    this._linksTotal = byHref.size;
    this._linksDone = 0;
    this._updateLinkCheckBadge();

    if (byHref.size === 0) return;

    byHref.forEach((elements, href) => {
      this._linkChecker.check(href).then((result) => {
        if (seq !== this._linkCheckSeq || this._destroyed) return;
        this._linkStatus.set(href, { result, elements });
        this._linksDone += 1;
        this._updateLinkCheckBadge();
        this._softRefresh();
      });
    });
  }

  /**
   * Adds a status badge to the hero area showing "Checking X of Y links…"
   * while requests are in flight. The badge disappears when all checks
   * resolve.
   */
  _updateLinkCheckBadge() {
    if (!this._auditRoot) return;
    const hero = this._auditRoot.querySelector('.penman-audit-hero');
    if (!hero) return;
    let badge = hero.querySelector('.penman-audit-linkcheck-badge');

    if (this._linksTotal === 0 || this._linksDone >= this._linksTotal) {
      if (badge) badge.remove();
      return;
    }

    const text = this.t('plugins.audit.linkCheck.checking', {
      done: this._linksDone,
      total: this._linksTotal,
    });
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'penman-audit-linkcheck-badge';
      hero.appendChild(badge);
    }
    badge.textContent = text;
  }

  /**
   * Re-renders the body without re-running the sync engine — used while
   * async link checks resolve, to avoid wasted work.
   */
  _softRefresh() {
    if (!this._auditRoot) return;
    const report = this.engine.analyze(this.editor.editableArea);
    this._mergeLinkStatusIssues(report);
    const newBody = this._renderBody(report);
    const oldBody = this._auditRoot.querySelector('.penman-audit-body');
    if (oldBody && oldBody.parentNode) {
      oldBody.parentNode.replaceChild(newBody, oldBody);
    }
    // Also update score ring + stats since the new issues affect them.
    const newHero = this._renderHero(report);
    const oldHero = this._auditRoot.querySelector('.penman-audit-hero');
    if (oldHero && oldHero.parentNode) {
      oldHero.parentNode.replaceChild(newHero, oldHero);
    }
  }

  /**
   * Folds async link-status results into the synchronous report so the
   * sorting / scoring / category-count logic includes them naturally.
   */
  _mergeLinkStatusIssues(report) {
    if (!this._linkStatus.size) return;

    const extras = [];
    this._linkStatus.forEach(({ result, elements }, href) => {
      let titleKey, descKey, whyKey, fixKey, severity, locKey;
      if (result.state === 'broken') {
        severity = 'critical';
        titleKey = 'plugins.audit.rules.link-status-broken.title';
        descKey = 'plugins.audit.rules.link-status-broken.desc';
        whyKey = 'plugins.audit.rules.link-status-broken.why';
        fixKey = 'plugins.audit.rules.link-status-broken.fix';
        locKey = 'plugins.audit.loc.urlWithStatus';
      } else if (result.state === 'timeout') {
        severity = 'warning';
        titleKey = 'plugins.audit.rules.link-status-timeout.title';
        descKey = 'plugins.audit.rules.link-status-timeout.desc';
        whyKey = 'plugins.audit.rules.link-status-timeout.why';
        fixKey = 'plugins.audit.rules.link-status-timeout.fix';
        locKey = 'plugins.audit.loc.url';
      } else if (result.state === 'network') {
        severity = 'warning';
        titleKey = 'plugins.audit.rules.link-status-network.title';
        descKey = 'plugins.audit.rules.link-status-network.desc';
        whyKey = 'plugins.audit.rules.link-status-network.why';
        fixKey = 'plugins.audit.rules.link-status-network.fix';
        locKey = 'plugins.audit.loc.url';
      } else {
        // 'ok' and 'cors' don't surface as issues (cors = uncheckable, not failure)
        return;
      }
      // One issue per element so each can be scrolled-to individually.
      for (const el of elements) {
        extras.push({
          ruleId: result.state === 'broken'
            ? 'link-status-broken'
            : (result.state === 'timeout' ? 'link-status-timeout' : 'link-status-network'),
          category: 'links',
          severity,
          titleKey, descKey, whyKey, fixKey,
          autoFix: null,
          element: el,
          locKey,
          locParams: { url: href, status: result.status || '—' },
        });
      }
    });

    if (extras.length === 0) return;

    report.issues.push(...extras);
    if (!report.issuesByCategory.links) report.issuesByCategory.links = [];
    report.issuesByCategory.links.push(...extras);

    // Re-score now that the link issues are included.
    const weights = { critical: 15, warning: 8, suggestion: 3 };
    let score = 100;
    for (const i of report.issues) score -= weights[i.severity] || 0;
    score = Math.max(0, Math.min(100, score));
    report.score = score;
    if (score >= 90) report.labelKey = 'plugins.audit.quality.excellent';
    else if (score >= 75) report.labelKey = 'plugins.audit.quality.good';
    else if (score >= 60) report.labelKey = 'plugins.audit.quality.fair';
    else if (score >= 40) report.labelKey = 'plugins.audit.quality.weak';
    else report.labelKey = 'plugins.audit.quality.poor';

    // Update category score for links.
    let linkScore = 100;
    for (const i of (report.issuesByCategory.links || [])) {
      linkScore -= weights[i.severity] || 0;
    }
    report.categoryScores.links = Math.max(0, Math.min(100, linkScore));
  }

  _renderHero(report) {
    const hero = document.createElement('div');
    hero.className = 'penman-audit-hero';

    // Score ring
    const score = report.score;
    const colorFor = (s) => s >= 70 ? '#22c55e' : (s >= 40 ? '#f59e0b' : '#ef4444');
    const qualityLabel = this.t(report.labelKey);
    // Derive a stable data-q key from the i18n key suffix (excellent|good|fair|weak|poor)
    const qualityKey = (report.labelKey.split('.').pop() || '').toLowerCase();
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const scoreAria = this.t('plugins.audit.scoreAria', { score });

    const left = document.createElement('div');
    left.className = 'penman-audit-score';
    left.innerHTML = `
      <div class="penman-audit-score-ring" aria-label="${escapeHtml(scoreAria)}">
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <circle class="track" cx="80" cy="80" r="${radius}"></circle>
          <circle class="fill" cx="80" cy="80" r="${radius}"
                  stroke="${colorFor(score)}"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="label">
          <span class="num">${score}</span>
          <span class="max">/ 100</span>
        </div>
      </div>
      <div class="penman-audit-score-quality" data-q="${escapeHtml(qualityKey)}">${escapeHtml(qualityLabel)}</div>
    `;

    // Stats grid
    const stats = report.stats;
    const issues = report.issues || [];
    const critCount = issues.filter(i => i.severity === 'critical').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;

    const right = document.createElement('div');
    right.className = 'penman-audit-stats';
    right.innerHTML = `
      ${this._stat(stats.wordCount, this.t('plugins.audit.stats.words'))}
      ${this._stat(this.t('plugins.audit.stats.readMinutes', { count: stats.readingMinutes }), this.t('plugins.audit.stats.readTime'))}
      ${this._stat(stats.headingCount, this.t('plugins.audit.stats.headings'))}
      ${this._stat(stats.imageCount, this.t('plugins.audit.stats.images'))}
      ${this._stat(stats.internalLinkCount, this.t('plugins.audit.stats.internalLinks'))}
      ${this._stat(stats.externalLinkCount, this.t('plugins.audit.stats.externalLinks'))}
      ${this._stat(critCount, this.t('plugins.audit.stats.issues'), critCount > 0 ? 'danger' : '')}
      ${this._stat(warnCount, this.t('plugins.audit.stats.warnings'), warnCount > 0 ? 'warn' : '')}
    `;

    hero.appendChild(left);
    hero.appendChild(right);
    return hero;
  }

  _stat(value, label, modifier = '') {
    return `
      <div class="penman-audit-stat ${modifier}">
        <span class="num">${escapeHtml(value)}</span>
        <span class="lbl">${escapeHtml(label)}</span>
      </div>
    `;
  }

  _renderBody(report) {
    const body = document.createElement('div');
    body.className = 'penman-audit-body';

    const cats = Object.keys(CATEGORY_META).sort(
      (a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order
    );

    const hasAny = cats.some(c => (report.issuesByCategory[c] || []).length > 0);
    if (!hasAny) {
      body.innerHTML = `
        <div class="penman-audit-empty">
          ${ICONS.check}
          <h3>${escapeHtml(this.t('plugins.audit.allClear'))}</h3>
          <p>${escapeHtml(this.t('plugins.audit.allClearDesc'))}</p>
        </div>
      `;
      return body;
    }

    for (const cat of cats) {
      const issues = report.issuesByCategory[cat] || [];
      if (issues.length === 0) continue;
      body.appendChild(this._renderCategory(cat, issues, report.categoryScores[cat]));
    }

    return body;
  }

  _renderCategory(catId, issues, score) {
    const meta = CATEGORY_META[catId];
    const wrap = document.createElement('section');
    wrap.className = 'penman-audit-category';
    const openByDefault = issues.some(i => i.severity === 'critical');
    const open = this._openCategories.has(catId) || openByDefault;
    wrap.dataset.open = open ? 'true' : 'false';

    const crit = issues.filter(i => i.severity === 'critical').length;
    const warn = issues.filter(i => i.severity === 'warning').length;
    const sugg = issues.filter(i => i.severity === 'suggestion').length;

    const scoreClass = score >= 80 ? 'score-good' : (score >= 50 ? 'score-fair' : 'score-poor');
    const label = this.t(meta.labelKey);

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'penman-audit-category-head';
    head.setAttribute('aria-expanded', String(open));
    head.innerHTML = `
      <span class="penman-audit-chevron">${ICONS.chevron}</span>
      <span class="penman-audit-category-icon">${ICONS[catId] || ICONS.audit}</span>
      <span class="penman-audit-category-title">${escapeHtml(label)}</span>
      <span class="penman-audit-category-meta">
        <span class="penman-audit-badge ${scoreClass}">${score}</span>
        ${crit ? `<span class="penman-audit-badge critical">${crit}</span>` : ''}
        ${warn ? `<span class="penman-audit-badge warning">${warn}</span>` : ''}
        ${sugg ? `<span class="penman-audit-badge suggestion">${sugg}</span>` : ''}
      </span>
    `;

    head.addEventListener('click', () => {
      const next = wrap.dataset.open !== 'true';
      wrap.dataset.open = next ? 'true' : 'false';
      head.setAttribute('aria-expanded', String(next));
      if (next) this._openCategories.add(catId);
      else this._openCategories.delete(catId);
    });

    wrap.appendChild(head);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'penman-audit-category-body';
    issues
      .slice()
      .sort((a, b) => this._severityOrder(a.severity) - this._severityOrder(b.severity))
      .forEach(issue => bodyEl.appendChild(this._renderIssue(issue)));
    wrap.appendChild(bodyEl);

    return wrap;
  }

  _severityOrder(s) {
    return ({ critical: 0, warning: 1, suggestion: 2, passed: 3 })[s] ?? 99;
  }

  _renderIssue(issue) {
    const row = document.createElement('div');
    row.className = 'penman-audit-issue';
    row.dataset.severity = issue.severity;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');

    // Translate every user-visible string at render time.
    const title = this.t(issue.titleKey);
    const desc = this.t(issue.descKey);
    const why = issue.whyKey ? this.t(issue.whyKey) : '';
    const fix = issue.fixKey ? this.t(issue.fixKey) : '';
    const severityLabel = this.t(`plugins.audit.severity.${issue.severity}`);
    const location = issue.locKey ? this.t(issue.locKey, issue.locParams || {}) : '';

    row.setAttribute('aria-label', `${title}. ${severityLabel}.`);

    const icon = SEVERITY_ICON_MAP[issue.severity] || ICONS.suggestion;

    const locationHtml = location
      ? `<span class="penman-audit-issue-loc">${escapeHtml(location)}</span>`
      : '';

    const fixHtml = fix
      ? `<div class="penman-audit-issue-fix"><strong>${escapeHtml(this.t('plugins.audit.fix'))}:</strong> ${escapeHtml(fix)}</div>`
      : '';

    const autoFixHtml = issue.autoFix && issue.element
      ? `<button type="button" class="penman-audit-autofix">${escapeHtml(this.t('plugins.audit.autoFix'))}</button>`
      : '';

    row.innerHTML = `
      <span class="penman-audit-issue-icon">${icon}</span>
      <div class="penman-audit-issue-body">
        <p class="penman-audit-issue-title">${escapeHtml(title)}</p>
        <p class="penman-audit-issue-desc">${escapeHtml(desc)}</p>
        <div class="penman-audit-issue-meta">
          ${locationHtml}
          ${why ? `<span>${escapeHtml(why)}</span>` : ''}
        </div>
        ${fixHtml}
      </div>
      <div class="penman-audit-issue-actions">
        ${autoFixHtml}
      </div>
    `;

    // Click: scroll to + flash the affected element
    const onActivate = (e) => {
      if (e.target.closest('.penman-audit-autofix')) return; // let auto-fix handle its own click
      this._highlightInEditor(issue.element);
    };
    row.addEventListener('click', onActivate);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    });

    const autoFixBtn = row.querySelector('.penman-audit-autofix');
    if (autoFixBtn) {
      autoFixBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          issue.autoFix(issue, this.editor);
          if (this.editor.history) this.editor.history.pushImmediate();
          this.editor.emit('change', this.editor.getContent());
        } catch (_) { /* noop */ }
        // Force immediate re-render after fix
        this._render();
      });
    }

    return row;
  }

  _highlightInEditor(element) {
    if (!element || !this.editor.editableArea.contains(element)) return;

    // Scroll into view (in the editor's scroll container)
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      element.scrollIntoView();
    }

    // Flash highlight
    element.classList.add('penman-audit-flash');
    setTimeout(() => element.classList.remove('penman-audit-flash'), 1500);
  }
}

export { ICONS as AUDIT_ICONS };
