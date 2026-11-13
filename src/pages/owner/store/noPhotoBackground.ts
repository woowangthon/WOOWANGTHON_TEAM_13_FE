// 매장 등록 완료 · 알바생 입장 완료 카드 (11/14 나현)

/** 매장 사진이 없을 때 바탕: 연한 매장 색 + 연한 점 무늬 (지름 3px · 26px 간격) — 휴대폰 등록 완료 카드도 같이 쓴다 */
export const NO_PHOTO_BACKGROUND = {
  backgroundColor: 'var(--brand-soft)',
  backgroundImage:
    'radial-gradient(circle, color-mix(in srgb, var(--brand) 22%, transparent) 1.5px, transparent 1.6px)',
  backgroundSize: '26px 26px',
} as const
