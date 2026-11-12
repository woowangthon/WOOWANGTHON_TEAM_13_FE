import type { StoreTheme } from '@/lib/api/types'

// 매장 테마 색 — 사장 · 알바 화면이 함께 사용 (담당: 민지)
// API 는 테마 키(moon · sunset)만 주고, 실제 색은 여기서 정한다. 아이콘은 shared/icons STORE_ICON

export interface StoreThemeColors {
  /** 매장 색 (--brand) */
  color: string
  /** 매장 연한 색 (--brand-soft) */
  soft: string
  /** 매장 사진 위 전체를 어둡게 덮는 그라데이션 (초대코드 입장 화면) */
  scrim: string
  /** 매장 사진 아래쪽만 옅게 어둡게 (알바 홈 오늘 근무 카드: 위쪽 절반은 투명, 아래 흰 글씨가 밝은 사진에서도 읽히게) */
  photoShade: string
}

export const STORE_THEME: Record<StoreTheme, StoreThemeColors> = {
  moon: {
    color: '#2A4536',
    soft: '#E3E8DC',
    scrim: 'linear-gradient(180deg, rgba(24,36,29,0.15) 0%, rgba(24,36,29,0.85) 78%)',
    photoShade:
      'linear-gradient(180deg, rgba(24,36,29,0) 40%, rgba(24,36,29,0.55) 68%, rgba(24,36,29,0.8) 100%)',
  },
  sunset: {
    color: '#6E3B26',
    soft: '#F3E3D6',
    scrim: 'linear-gradient(180deg, rgba(60,32,20,0.15) 0%, rgba(60,32,20,0.85) 78%)',
    photoShade:
      'linear-gradient(180deg, rgba(60,32,20,0) 40%, rgba(60,32,20,0.55) 68%, rgba(60,32,20,0.8) 100%)',
  },
}

/** 테마를 저장하지 않은 매장(null)의 기본 테마 */
export const DEFAULT_STORE_THEME: StoreTheme = 'moon'

/** BE 가 테마를 안 주면 매장 순서대로 이 순서로 정한다 (초록 → 갈색 → 초록 …) */
const THEME_ORDER: StoreTheme[] = ['moon', 'sunset']

/** 매장 테마: BE 값이 있으면 그대로, 없으면 내 매장 목록 순서(index)로 */
export function themeOf(theme: StoreTheme | null, index: number): StoreTheme {
  return theme ?? THEME_ORDER[index % THEME_ORDER.length]
}
