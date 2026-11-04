import type { StoreTheme } from '@/lib/api/types'

// 매장 테마 색 — 사장 · 알바 화면이 함께 사용 (담당: 민지)
// API 는 테마 키(moon · sunset)만 주고, 실제 색은 여기서 정한다. 아이콘은 shared/icons STORE_ICON

export interface StoreThemeColors {
  /** 매장 색 (--brand) */
  color: string
  /** 매장 연한 색 (--brand-soft) */
  soft: string
  /** 매장 사진 위 어둡게 덮는 그라데이션 */
  scrim: string
}

export const STORE_THEME: Record<StoreTheme, StoreThemeColors> = {
  moon: {
    color: '#2A4536',
    soft: '#E3E8DC',
    scrim: 'linear-gradient(180deg, rgba(24,36,29,0.15) 0%, rgba(24,36,29,0.85) 78%)',
  },
  sunset: {
    color: '#6E3B26',
    soft: '#F3E3D6',
    scrim: 'linear-gradient(180deg, rgba(60,32,20,0.15) 0%, rgba(60,32,20,0.85) 78%)',
  },
}

/** 테마를 저장하지 않은 매장(null)의 기본 테마 */
export const DEFAULT_STORE_THEME: StoreTheme = 'moon'
