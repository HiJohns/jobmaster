import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.VITE_PORT || '5173', 10)
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5555'

  return {
    plugins: [react()],
    server: {
      port,
      host: '0.0.0.0',
      allowedHosts: ['opencode.linxdeep.com'],
      proxy: {
        '/api/v1': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/demo': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
})