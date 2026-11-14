import { useSyncExternalStore } from 'react'

// 사장님 화면이 데스크톱(lg 1024px 이상)인지 — 창 크기를 바꾸면 바로 바뀐다.
// CSS(lg:)로 안 되는 것(시트 대신 오른쪽 칸 · 앱 사용법 모양)을 고를 때만 쓴다

const WIDE = '(min-width: 1024px)'

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(WIDE)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches)
