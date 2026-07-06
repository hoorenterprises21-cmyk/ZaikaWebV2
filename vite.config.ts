import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds into /public_html for direct Hostinger deployment.
// `base: './'` makes asset paths relative so it works under any subfolder.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/ZaikaWebV2',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'public_html',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
