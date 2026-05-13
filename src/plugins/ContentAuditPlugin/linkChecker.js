/**
 * LinkChecker — async HTTP status verification for the Content Audit.
 *
 * The synchronous AuditEngine cannot see HTTP 4xx / 5xx errors because they
 * require a network round-trip. This module performs that check in the
 * background, with:
 *
 *   - HEAD requests (lightweight, no body)
 *   - bounded concurrency (default 4 inflight)
 *   - per-URL timeout (default 6s) with AbortController
 *   - per-session cache so each unique URL is fetched at most once
 *   - graceful CORS handling — opaque responses are reported as
 *     "uncheckable" rather than false positives
 *   - optional `proxyUrl` for sites that block CORS (the host application
 *     can run a tiny endpoint that proxies HEAD requests)
 *
 * Result shape:
 *   {
 *     status:   number,   // HTTP status code, or 0 if uncheckable / timeout
 *     ok:       boolean,  // true for 2xx, false for everything else
 *     state:    'ok' | 'broken' | 'timeout' | 'cors' | 'network' | 'invalid',
 *     message?: string,
 *   }
 *
 *   - 'ok'       — 2xx response
 *   - 'broken'   — 4xx / 5xx
 *   - 'timeout'  — abort after `timeout` ms
 *   - 'cors'     — preflight or response blocked by CORS (can't tell status)
 *   - 'network'  — generic fetch failure (DNS, offline, etc.)
 *   - 'invalid'  — URL itself is not parseable
 */

export class LinkChecker {
  constructor({ timeout = 6000, concurrency = 4, proxyUrl = null } = {}) {
    this.timeout = timeout;
    this.concurrency = concurrency;
    this.proxyUrl = proxyUrl;
    this.cache = new Map(); // url → result
    this._inflight = 0;
    this._queue = [];
  }

  /**
   * Returns a result object for the given URL. Cached after the first call.
   * Does not throw — every failure path resolves with a structured result.
   */
  check(url) {
    if (!url || typeof url !== 'string') {
      return Promise.resolve({ status: 0, ok: false, state: 'invalid' });
    }
    if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));

    return new Promise((resolve) => {
      this._queue.push({ url, resolve });
      this._drain();
    });
  }

  /**
   * Clears the in-memory cache. Useful when the host application explicitly
   * wants to re-verify (e.g. after a "Recheck" user action).
   */
  clear() { this.cache.clear(); }

  _drain() {
    while (this._inflight < this.concurrency && this._queue.length) {
      const { url, resolve } = this._queue.shift();
      this._inflight += 1;
      this._run(url)
        .then((res) => { this.cache.set(url, res); resolve(res); })
        .catch(() => { /* _run never throws */ })
        .finally(() => { this._inflight -= 1; this._drain(); });
    }
  }

  async _run(url) {
    // Reject patently invalid URLs up front so we don't waste a request.
    if (!this._isFetchable(url)) {
      return { status: 0, ok: false, state: 'invalid' };
    }

    const target = this.proxyUrl
      ? this.proxyUrl + encodeURIComponent(url)
      : url;

    const ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = (ac && typeof setTimeout !== 'undefined')
      ? setTimeout(() => ac.abort(), this.timeout)
      : null;

    try {
      const response = await fetch(target, {
        method: 'HEAD',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store',
        credentials: 'omit',
        signal: ac ? ac.signal : undefined,
      });
      const status = response.status || 0;
      if (response.type === 'opaque' || status === 0) {
        // CORS-blocked or opaque — we couldn't read the actual status.
        return { status: 0, ok: false, state: 'cors' };
      }
      return {
        status,
        ok: response.ok,
        state: response.ok ? 'ok' : 'broken',
      };
    } catch (err) {
      const name = (err && err.name) || '';
      if (name === 'AbortError') {
        return { status: 0, ok: false, state: 'timeout' };
      }
      // Distinguish CORS rejection from genuine network errors when we can.
      // Browsers do not give us a fine-grained reason, so we report generic
      // "network" and let the UI explain the limitation.
      const message = (err && err.message) || '';
      const isCors = /cors|cross.?origin|preflight/i.test(message);
      return {
        status: 0,
        ok: false,
        state: isCors ? 'cors' : 'network',
        message,
      };
    } finally {
      if (timer != null) clearTimeout(timer);
    }
  }

  _isFetchable(url) {
    if (typeof URL === 'undefined') return false;
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }
}
