import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AI 사수',
        short_name: 'AI 사수',
        description: '개인 카페 신입 알바생의 AI 사수',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        // 앱 배경색(canvas)과 맞춰서 시작 화면 · 상태 바가 흰 띠로 보이지 않게
        background_color: '#F1ECE3',
        theme_color: '#F1ECE3',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
})
