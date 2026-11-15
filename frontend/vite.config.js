import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const ENGINE_URL = process.env.ENGINE_URL || 'http://127.0.0.1:8000'
const APPS_URL = process.env.APPS_URL || 'http://127.0.0.1:8100'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api/ecommerce': ENGINE_URL,
      '/api/media/bench/': ENGINE_URL,
      '/motor/': { target: ENGINE_URL, rewrite: path => path.replace(/^\/motor/, '') },
      '/api': APPS_URL,
    },
  },
})
