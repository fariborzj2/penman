import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

/**
 * Penman build config.
 *
 * Produces three artifacts in `dist/`:
 *
 *   penman.umd.js   — UMD bundle for CDN / <script> tag usage. CSS is
 *                     inlined into the JS and injected into the document
 *                     at runtime, so consumers need only ONE script tag.
 *   penman.es.js    — ES module for bundlers (Vite/Rollup/Webpack). Also
 *                     ships with inlined CSS so `import 'penman-editor'`
 *                     is enough — no separate stylesheet to remember.
 *   penman.css      — Extracted CSS file kept alongside the JS for users
 *                     who want to load styles ahead of the JS (avoids the
 *                     FOUC that JS-injected CSS can cause on slow networks).
 *                     Also gives them a single override target.
 */
export default defineConfig({
  plugins: [
    // Inline the editor's CSS into the JS bundle. Activates the runtime
    // injection on first import so the editor is usable from a plain
    // <script src="..."></script> with no extra <link>.
    cssInjectedByJsPlugin({
      // Keep the standalone .css file too so power-users can preload.
      preRenderCSSCode: (cssCode) => cssCode,
      styleId: 'penman-editor-styles',
      injectCodeFunction: function (cssCode, options) {
        try {
          if (typeof document === 'undefined') return;
          // Avoid double-injection if the bundle is loaded twice (e.g. CDN
          // included on multiple pages of an SPA).
          if (document.getElementById(options.styleId)) return;
          const style = document.createElement('style');
          style.id = options.styleId;
          style.appendChild(document.createTextNode(cssCode));
          document.head.appendChild(style);
        } catch (_) { /* noop */ }
      }
    })
  ],
  build: {
    minify: 'esbuild',
    sourcemap: true,
    target: 'es2020',
    cssMinify: true,
    lib: {
      entry: 'src/index.js',
      name: 'penman',
      formats: ['umd', 'es'],
      fileName: (format) => `penman.${format}.js`
    },
    rollupOptions: {
      output: {
        // Bundle is self-contained — no externals (no peer deps to mark).
        globals: {},
        // src/index.js uses `export default penman`. Without this, the UMD
        // bundle attaches `{ default: penman }` to `window.penman`, forcing
        // CDN users to write `penman.default.init(...)`. Setting exports to
        // 'default' makes `window.penman` *be* the penman object, so
        // `penman.init(...)` works as documented.
        exports: 'default'
      }
    }
  },
  server: {
    proxy: {
      '/upload': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  }
});
