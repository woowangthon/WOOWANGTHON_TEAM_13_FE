import type { Me } from '@/lib/authStore'

// 가짜 데이터: GET /me — 응답 모양이 정해지기 전까지 사용. 새 사용자라 소속 매장이 없다 (→ 역할 선택)

export function mockMe(userId: string, nickname: string): Me {
  return { userId, nickname, stores: [] }
}
