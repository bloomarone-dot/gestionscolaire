import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// La gateway est exposée sur le port 8080 par infra/docker-compose.yml.
// Surcharge possible via VITE_GATEWAY_URL (ex. http://127.0.0.1:8000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gateway = env.VITE_GATEWAY_URL || 'http://127.0.0.1:8080'
  const proxied = [
    '/auth', '/tenants', '/referentiel', '/pedagogie', '/personnel',
    '/eleves', '/evaluations', '/bulletins', '/notifications',
  ]
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: Object.fromEntries(
        proxied.map((p) => [p, { target: gateway, changeOrigin: true }]),
      ),
    },
  }
})
