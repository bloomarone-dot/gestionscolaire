import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/eleves': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/notes': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/bulletin': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/schools': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/admin': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/professor': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/superadmin': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    }
  }
})
