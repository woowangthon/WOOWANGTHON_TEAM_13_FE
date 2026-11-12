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
        // 서비스 이름은 crewBean (11/10 회의). AI 채팅 기능 이름은 그대로 "AI 사수"
        name: 'crewBean',
        short_name: 'crewBean',
        description: '카페 알바생의 AI 사수, crewBean',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        // 앱 배경색(canvas)과 맞춰서 시작 화면 · 상태 바가 흰 띠로 보이지 않게
        background_color: '#F1ECE3',
        theme_color: '#F1ECE3',
        // 홈 화면 · 설치 아이콘 (public/, 나현). maskable 은 넣지 않는다: 지금 아이콘은 배경이 투명하고
        // 캐릭터가 가장자리(안전 영역 80% 밖)까지 있어서, 안드로이드가 동그랗게 자르면 모자 · 발이 잘린다
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
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
