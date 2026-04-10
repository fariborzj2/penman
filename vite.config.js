import { defineConfig } from 'vite';

export default defineConfig({
  build: {
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
  }
});