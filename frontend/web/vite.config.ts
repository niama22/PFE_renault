import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/admin':    { target: 'http://localhost:8082', changeOrigin: true, rewrite: p => p.replace(/^\/api\/admin/, '/api/v1/admin') },
      '/api/operateur':{ target: 'http://localhost:8091', changeOrigin: true, rewrite: p => p.replace(/^\/api\/operateur/, '/api/v1/operateur') },
      '/api/client':   { target: 'http://localhost:3001', changeOrigin: true, rewrite: p => p.replace(/^\/api\/client/, '/api/v1/clients/me') },
      '/auth':         { target: 'http://localhost:8180', changeOrigin: true, rewrite: p => p.replace(/^\/auth/, '') },
    },
  },
})
