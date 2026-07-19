import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Dev proxy target is overridable so `docker compose` can point /api at the
// backend container (VITE_PROXY_TARGET=http://backend:8000).
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8099'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
