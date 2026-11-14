import { getJoinedStoreIds, staffNameOf } from '@/api/mocks/staff/join'
import { findStaffStore, staffStores, type StaffStore } from '@/api/mocks/staff/stores'
import { useAuthStore, type Me } from '@/lib/authStore'
import { env } from '@/lib/env'
import type { MyStoreDetail, MyStoreList } from '@/lib/api/types'

// 가짜 서버: 사용자 API (docs/07 1) — 소속 매장은 초대코드로 들어간 매장 (join.ts)

/** GET /users/me — 서버는 토큰으로 사용자를 알지만, 가짜 서버는 로그인 정보를 받아서 만든다 */
export async function getMe(user: Omit<Me, 'stores'>): Promise<Me> {
  const stores = getJoinedStoreIds().map((storeId) => ({
    storeId,
    storeName: findStaffStore(storeId).name,
    role: 'staff' as const,
  }))
  return { ...user, stores }
}

function toDetail(store: StaffStore): MyStoreDetail {
  return {
    storeId: store.id,
    name: store.name,
    kind: store.kind,
    address: store.address,
    ownerName: store.ownerName,
    role: 'staff',
    memberId: `mbr_${store.id}`,
    staffName: staffNameOf(store.id),
    photoUrl: store.photo ?? null,
    theme: store.icon ?? null,
    joinedAt: '2026-11-03T22:40:00+09:00',
  }
}

/** GET /users/me/stores — VITE_SKIP_AUTH 로 로그인 없이 볼 때는 시연 매장을 모두 */
export async function getMyStores(): Promise<MyStoreList> {
  const showAll = env.skipAuth && !useAuthStore.getState().me
  const joined = getJoinedStoreIds()
  const list = staffStores.filter((store) =>
    showAll ? !store.hiddenUntilJoined || joined.includes(store.id) : joined.includes(store.id),
  )
  return { stores: list.map(toDetail) }
}
