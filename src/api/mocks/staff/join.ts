import { findStaffStore, type StaffStore } from '@/api/mocks/staff/stores'

/*
 * 가짜 데이터: 초대코드 확인 · 매장 입장 — BE 연결 전까지 사용.
 * 들어간 매장은 서버 대신 localStorage 에 기억한다 (새로고침해도 GET /me 에 남도록).
 * 틀린 횟수 세기 · 잠금은 BE 가 한다. 여기서는 잠김 응답만 흉내 낸다 (LOCKED_TEST_CODE).
 */

export interface InviteInfo {
  code: string
  store: StaffStore
  /** 사장님이 알바생 추가할 때 적은 이름 (본인 확인) */
  staffName: string
}

/** invalid 없는 코드 · joined 이미 들어간 매장 · locked 5번 틀려 잠김 */
export type InviteErrorReason = 'invalid' | 'joined' | 'locked'

export class InviteError extends Error {
  reason: InviteErrorReason

  constructor(reason: InviteErrorReason) {
    super(`초대코드 확인 실패 (${reason})`)
    this.reason = reason
  }
}

/** 알바생 전용 초대코드 (헷갈리는 0 · O · 1 · I 는 쓰지 않는다) */
const INVITES = [
  { code: 'K7P2QX', storeId: 'dalbit', staffName: '지은' },
  { code: 'M3XR9D', storeId: 'afternoon', staffName: '지은' },
]

/** 이 코드를 넣으면 서버가 "잠김"을 준 것처럼 동작한다 (화면 확인용) */
export const LOCKED_TEST_CODE = 'LLLLLL'

const JOINED_KEY = 'mock-joined-stores'

export function getJoinedStoreIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(JOINED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function verifyInviteCode(code: string): Promise<InviteInfo> {
  await wait(500)
  if (code === LOCKED_TEST_CODE) throw new InviteError('locked')
  const invite = INVITES.find((item) => item.code === code)
  if (!invite) throw new InviteError('invalid')
  if (getJoinedStoreIds().includes(invite.storeId)) throw new InviteError('joined')
  return { code, store: findStaffStore(invite.storeId), staffName: invite.staffName }
}

export async function joinStore(code: string): Promise<InviteInfo> {
  const info = await verifyInviteCode(code)
  localStorage.setItem(JOINED_KEY, JSON.stringify([...getJoinedStoreIds(), info.store.id]))
  return info
}
