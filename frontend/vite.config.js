import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      // proxy api calls to express backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
