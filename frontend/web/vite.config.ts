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
      '/api/admin':                 { target: 'http://localhost:8082', changeOrigin: true, rewrite: p => p.replace(/^\/api\/admin/, '/api/v1/admin') },
      '/api/operateur/optimization':{ target: 'http://localhost:8094', changeOrigin: true, rewrite: p => p.replace(/^\/api\/operateur\/optimization/, '/api/v1/responsable/optimization') },
      '/api/operateur':             { target: 'http://localhost:8091', changeOrigin: true, rewrite: p => p.replace(/^\/api\/operateur/, '/api/v1/operateur') },
      '/api/responsable':           { target: 'http://localhost:8094', changeOrigin: true, rewrite: p => p.replace(/^\/api\/responsable/, '/api/v1/responsable') },
      '/api/client':                { target: 'http://localhost:3001', changeOrigin: true, rewrite: p => p.replace(/^\/api\/client/, '/api/v1/clients/me') },
      '/auth':                      { target: 'http://localhost:8180', changeOrigin: true, rewrite: p => p.replace(/^\/auth/, '') },
    },
  },
})
