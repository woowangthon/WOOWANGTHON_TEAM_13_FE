import {
  addJoinedStore,
  getJoinedStoreIds,
  INVITES,
  LOCKED_TEST_CODE,
} from '@/api/mocks/staff/join'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { ApiError } from '@/lib/apiClient'
import type { InviteVerification, Membership } from '@/lib/api/types'

// 가짜 서버: 초대코드 API (docs/07 2) — 틀린 횟수 세기 · 잠금은 BE 가 한다. 여기서는 잠김 응답만 흉내 낸다

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function fail(status: number, code: string, message: string, detail: unknown = null): never {
  throw new ApiError(status, { code, message, detail })
}

async function check(code: string) {
  await wait(500)
  if (code === LOCKED_TEST_CODE) {
    fail(429, 'INVITE_LOCKED', '5번 틀려서 10분 동안 입력할 수 없어요', {
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
  }
  const invite = INVITES.find((item) => item.code === code)
  if (!invite) fail(404, 'INVITE_INVALID', '유효하지 않은 코드예요')
  const store = findStaffStore(invite.storeId)
  if (getJoinedStoreIds().includes(store.id)) {
    fail(409, 'INVITE_ALREADY_JOINED', '이미 들어간 매장이에요', {
      storeId: store.id,
      storeName: store.name,
    })
  }
  return { invite, store }
}

/** POST /invitations/verify — 입장은 하지 않고 어느 매장 · 누구 자리인지만 */
export async function verifyInvitation(code: string): Promise<InviteVerification> {
  const { invite, store } = await check(code)
  return {
    code,
    staffName: invite.staffName,
    store: {
      storeId: store.id,
      name: store.name,
      ownerName: store.ownerName,
      photoUrl: store.photo ?? null,
      theme: store.icon,
    },
  }
}

/** POST /memberships/join */
export async function joinMembership(code: string): Promise<Membership> {
  const { invite, store } = await check(code)
  addJoinedStore(store.id)
  return {
    storeId: store.id,
    storeName: store.name,
    memberId: `mbr_${store.id}`,
    role: 'staff',
    staffName: invite.staffName,
    joinedAt: new Date().toISOString(),
  }
}
