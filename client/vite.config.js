import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use a relative base path when building so hashed assets are resolved
// correctly even when the SPA is served from a sub-path (e.g. behind
// nginx or through a reverse proxy).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
}));
