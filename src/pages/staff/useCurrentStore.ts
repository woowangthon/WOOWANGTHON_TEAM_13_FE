import { useMemo } from 'react'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { useMyStores } from '@/lib/api/users'
import type { MyStoreDetail, StoreTheme } from '@/lib/api/types'
import { useStoreStore } from '@/lib/storeStore'
import { useStaffStore } from '@/pages/staff/staffStore'
import { STORE_THEME, themeOf } from '@/shared/storeTheme'

/**
 * 알바 화면에서 쓰는 매장 모양.
 * 매장 정보는 GET /users/me/stores(useMyStores), 색은 테마(shared/storeTheme, 없으면 매장 순서대로).
 * 근무는 useMySchedule(lib/api/schedule). today · shift 는 급여 화면만 쓰는 가짜 데이터 — 챕터 8 에서 바꾼다.
 */
export interface StaffStoreView {
  id: string
  name: string
  kind: string
  address: string
  ownerName: string
  staffName: string | null
  memberId: string
  /** 테마 키 (아이콘: shared/icons STORE_ICON) */
  icon: StoreTheme
  color: string
  soft: string
  scrim: string
  photo?: string
  /** 매장 목록 한 줄 (예: 주 3회 마감 · 박 사장님) */
  meta: string
  /** TODO(챕터 8): 급여 화면 전용 — 급여 API 로 바꾼다 */
  today: Date
  shift: { start: string; end: string; role: string }
}

function toView(store: MyStoreDetail, index: number): StaffStoreView {
  const icon = themeOf(store.theme, index)
  // TODO(챕터 8): 급여 화면 전용 값 — 급여 API 로 교체
  const { today, shift } = findStaffStore(store.storeId)
  return {
    id: store.storeId,
    name: store.name,
    kind: store.kind,
    address: store.address,
    ownerName: store.ownerName,
    staffName: store.staffName,
    memberId: store.memberId,
    icon,
    ...STORE_THEME[icon],
    photo: store.photoUrl ?? undefined,
    meta: [store.workSummary, store.ownerName].filter(Boolean).join(' · '),
    today,
    shift,
  }
}

/** 매장 정보를 받기 전 · 소속 매장이 없을 때 화면이 깨지지 않게 쓰는 빈 매장 */
const EMPTY_STORE: StaffStoreView = {
  ...toView(
    {
      storeId: '',
      name: '',
      kind: '',
      address: '',
      ownerName: '',
      role: 'staff',
      memberId: '',
      staffName: null,
      photoUrl: null,
      theme: null,
      workSummary: null,
      joinedAt: '',
    },
    0,
  ),
}

/**
 * 지금 선택한 매장 + 소속 매장 목록 (n잡). 마이페이지에서 삭제한 매장은 빠진다.
 * isPending 동안은 store 가 빈 매장이라 알바 화면 틀(StaffLayout)이 Spinner 를 보여 준다.
 */
export function useCurrentStore() {
  const currentStoreId = useStoreStore((state) => state.currentStoreId)
  const setCurrentStoreId = useStoreStore((state) => state.setCurrentStoreId)
  const removedStoreIds = useStaffStore((state) => state.removedStoreIds)
  const storesQuery = useMyStores()

  const data = storesQuery.data
  const stores = useMemo(
    () =>
      (data?.stores ?? [])
        // 테마 순서는 삭제 · 사장님 매장을 빼기 전 내 매장 목록 순서로 (매장 색이 바뀌지 않게)
        .map((store, index) => ({ store, view: toView(store, index) }))
        .filter(({ store }) => store.role === 'staff' && !removedStoreIds.includes(store.storeId))
        .map(({ view }) => view),
    [data, removedStoreIds],
  )
  const store = stores.find((s) => s.id === currentStoreId) ?? stores[0] ?? EMPTY_STORE

  return { store, stores, setCurrentStoreId, isPending: storesQuery.isPending }
}
