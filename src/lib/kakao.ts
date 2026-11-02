import { env } from '@/lib/env'

/*
 * 카카오 SDK 초기화 — 담당: 민지
 * 카톡 초대코드 공유(P1) 화면은 나현이 만들고, 이 함수로 SDK 를 준비한 뒤 window.Kakao.Share 를 쓴다.
 * SDK 버전은 https://developers.kakao.com/docs/latest/ko/javascript/getting-started 에서 최신 버전 확인 후 맞춘다.
 */

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'

interface KakaoSdk {
  init: (key: string) => void
  isInitialized: () => boolean
  Share: {
    sendDefault: (settings: Record<string, unknown>) => void
  }
}

declare global {
  interface Window {
    Kakao?: KakaoSdk
  }
}

let loading: Promise<KakaoSdk> | null = null

export function loadKakao(): Promise<KakaoSdk> {
  if (window.Kakao?.isInitialized()) return Promise.resolve(window.Kakao)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = KAKAO_SDK_URL
    script.async = true
    script.onload = () => {
      if (!window.Kakao) return reject(new Error('카카오 SDK를 불러오지 못했어요'))
      if (!window.Kakao.isInitialized()) window.Kakao.init(env.kakaoJsKey)
      resolve(window.Kakao)
    }
    script.onerror = () => reject(new Error('카카오 SDK를 불러오지 못했어요'))
    document.head.appendChild(script)
  })
  return loading
}
