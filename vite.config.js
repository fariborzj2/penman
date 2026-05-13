import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Generate minified production bundles with source maps for debugging.
    // esbuild minification is fast and produces strong size reductions.
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
        globals: {}
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
