import { useEffect } from 'react'

/*
 * 폰 주소창 · 상태 바 색(<meta name="theme-color">)을 이 화면이 보이는 동안만 바꾼다 — 담당: 민지
 * 화면을 벗어나면 index.html 의 원래 값(사장님 화면과 같이 쓰는 크림색)으로 되돌린다.
 * 흰 바탕 화면 여러 개가 겹쳐 바뀌어도(로그인 → 역할 → 알바 홈) 마지막 하나가 사라질 때만 되돌린다
 *
 * 사용 예: useThemeColor(white ? WHITE_THEME_COLOR : null)  — null 이면 아무것도 안 함
 */

/** 알바 화면 · 로그인/입장 흰 바탕일 때 상태 바 색 */
export const WHITE_THEME_COLOR = '#FFFFFF'

let original: string | null = null
let active = 0

export function useThemeColor(color: string | null) {
  useEffect(() => {
    if (!color) return
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    if (active === 0) original = meta.content
    active += 1
    meta.content = color
    return () => {
      active -= 1
      if (active === 0 && original !== null) meta.content = original
    }
  }, [color])
}
