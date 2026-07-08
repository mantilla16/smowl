import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    },
    allowedHosts: ['.trycloudflare.com', '.loca.lt', 'localhost'],
    proxy: {
      '/api/smowl': {
        target: 'https://swl.smowltech.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smowl/, ''),
      }
    }
  }
})