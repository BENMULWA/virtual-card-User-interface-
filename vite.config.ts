import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api to the FastAPI backend so the browser sees a single
// origin. That means no CORS preflight in development and the same code works
// in production when the UI is served behind the same nginx host.
export default defineConfig(({ mode }) => {
  // vite.config does not see .env files on its own; load them so VITE_PROXY_TARGET in .env.local works.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}
})
