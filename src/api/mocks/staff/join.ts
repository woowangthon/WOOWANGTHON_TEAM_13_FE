/*
 * 가짜 데이터: 초대코드 · 들어간 매장 — BE 연결 전까지 사용 (확인 · 입장 API 는 api/invitations.ts).
 * 들어간 매장은 서버 대신 localStorage 에 기억한다 (새로고침해도 GET /users/me 에 남도록).
 */

/** 알바생 전용 초대코드 (헷갈리는 0 · O · 1 · I 는 쓰지 않는다) */
export const INVITES = [
  { code: 'K7P2QX', storeId: 'dalbit', staffName: '지은' },
  { code: 'M3XR9D', storeId: 'afternoon', staffName: '지은' },
]

/** 이 코드를 넣으면 서버가 "잠김"을 준 것처럼 동작한다 (화면 확인용, BE 연결 시 삭제) */
export const LOCKED_TEST_CODE = 'LLLLLL'

const JOINED_KEY = 'mock-joined-stores'

export function getJoinedStoreIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(JOINED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function addJoinedStore(storeId: string) {
  localStorage.setItem(JOINED_KEY, JSON.stringify([...getJoinedStoreIds(), storeId]))
}

/** 매장에서의 내 이름 (초대코드에 적힌 이름) */
export function staffNameOf(storeId: string) {
  return INVITES.find((invite) => invite.storeId === storeId)?.staffName ?? null
}
