import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStore,
  deleteStore,
  getOwnerStores,
  getProfile,
  updateProfile,
  updateStore,
  verifyBizNo,
} from '@/api/mocks/owner/api'
import { http, isRealApi } from '@/lib/api/source'
import { useAuthStore, type Me } from '@/lib/authStore'
import type {
  BizVerification,
  BizVerifyInput,
  BusinessSize,
  NewStore,
  OwnerStore,
  StoreResponse,
  StoreSize,
  StoreUpdate,
} from '@/pages/owner/api/types'

/*
 * 사장님 매장 · 프로필 훅 — 담당: 나현
 * .env VITE_REAL_API 에 'stores'를 넣으면 매장은 진짜 API(/stores), 아니면 가짜 서버(api/mocks/owner) — lib/api/source.
 * 사업자 확인도 'stores'를 따른다 (POST /business-verifications, 국세청 진위확인 → 매장 등록에 verificationId).
 */

/** 사업장 규모: 화면 under5 · over5 ↔ BE UNDER_FIVE · FIVE_OR_MORE */
const toBusinessSize = (size: StoreSize): BusinessSize =>
  size === 'over5' ? 'FIVE_OR_MORE' : 'UNDER_FIVE'

/** 급여일을 안 정한 매장(null)은 화면에서 10일로 보여 준다 (저장하면 그 값이 들어간다) */
const DEFAULT_PAYDAY = 10

/*
 * BE 매장 응답 → 화면 모양. BE 에 없는 값(종류 · 직원 수 · 사업자번호)은 기본값으로 채운다.
 * 테마는 null 이면 화면(useOwnerStore)이 매장 순서대로 색을 고른다.
 */
const toOwnerStore = (store: StoreResponse): OwnerStore => ({
  storeId: store.storeId,
  name: store.name,
  kind: '카페',
  address: store.address,
  theme: null,
  photoUrl: store.photoUrl,
  payday: store.payday ?? DEFAULT_PAYDAY,
  size: store.businessSize === 'FIVE_OR_MORE' ? 'over5' : 'under5',
  bizNo: null,
  staffCount: 0,
})

export const fetchStores = async (): Promise<{ stores: OwnerStore[] }> => {
  if (!isRealApi('stores')) return getOwnerStores()
  const { stores } = await http.get<{ stores: StoreResponse[] }>('/stores')
  return { stores: stores.map(toOwnerStore) }
}

const postStore = async (input: NewStore): Promise<OwnerStore> => {
  if (!isRealApi('stores')) return createStore(input)
  const store = await http.post<StoreResponse>('/stores', {
    name: input.name,
    address: input.address,
    businessSize: toBusinessSize(input.size),
    businessVerificationId: input.businessVerificationId,
  })
  return toOwnerStore(store)
}

// 이름 · 급여일 · 사업장 규모 (BE #27). 급여일은 1~28 · 31(말일)만 받는다
const patchStore = async (storeId: string, patch: StoreUpdate): Promise<OwnerStore> => {
  if (!isRealApi('stores')) return updateStore(storeId, patch)
  const store = await http.patch<StoreResponse>(`/stores/${storeId}`, {
    name: patch.name,
    payday: patch.payday,
    businessSize: patch.size && toBusinessSize(patch.size),
  })
  return toOwnerStore(store)
}

const removeStore = (storeId: string): Promise<void> =>
  isRealApi('stores') ? http.delete<void>(`/stores/${storeId}`) : deleteStore(storeId)

export const ownerKeys = {
  all: ['owner'] as const,
  stores: ['owner', 'stores'] as const,
  profile: ['owner', 'profile'] as const,
  members: (storeId: string) => ['owner', 'stores', storeId, 'members'] as const,
  onDuty: (storeId: string) => ['owner', 'stores', storeId, 'on-duty'] as const,
  questions: (storeId: string) => ['owner', 'stores', storeId, 'questions'] as const,
  notifications: ['owner', 'notifications'] as const,
  shifts: (storeId: string, month: string) =>
    ['owner', 'stores', storeId, 'shifts', month] as const,
  availability: (storeId: string) => ['owner', 'stores', storeId, 'availability'] as const,
  draft: (storeId: string) => ['owner', 'stores', storeId, 'draft'] as const,
  payroll: (storeId: string) => ['owner', 'stores', storeId, 'payroll'] as const,
}

export function useOwnerStores() {
  return useQuery({ queryKey: ownerKeys.stores, queryFn: fetchStores })
}

/*
 * 사장님 이름: 로그인한 사용자 이름(me.nickname, auth.ts 가 GET /users/me 로 채움)을 쓴다.
 * 로그인 없이 보는 시연(VITE_SKIP_AUTH)일 때만 가짜 프로필.
 */
export function useOwnerProfile() {
  const nickname = useAuthStore((state) => state.me?.nickname)
  return useQuery({
    queryKey: [...ownerKeys.profile, nickname ?? null],
    queryFn: async () => (nickname ? { name: nickname } : getProfile()),
  })
}

/** 이름 바꾸기: 진짜 API 면 PATCH /users/me { nickname } (알바 마이페이지와 같은 API) → 로그인 정보도 바꾼다 */
export function useUpdateOwnerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      if (!isRealApi('users')) return updateProfile(name)
      const me = await http.patch<Me>('/users/me', { nickname: name.trim() })
      return { name: me.nickname }
    },
    onSuccess: ({ name }) => {
      const { me, setMe } = useAuthStore.getState()
      if (me) setMe({ ...me, nickname: name })
      queryClient.invalidateQueries({ queryKey: ownerKeys.profile })
    },
  })
}

/** 매장 등록 (온보딩 · 마이페이지 매장 추가) */
export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postStore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.stores }),
  })
}

export function useUpdateStore(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: StoreUpdate) => patchStore(storeId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.stores }),
  })
}

export function useDeleteStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeStore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.all }),
  })
}

// 사업자 확인: 번호 · 대표자 이름 · 개업일이 국세청과 맞으면 VERIFIED (아니면 INVALID, 에러 아님)
const postBizVerification = (input: BizVerifyInput): Promise<BizVerification> =>
  isRealApi('stores')
    ? http.post<BizVerification>('/business-verifications', {
        businessRegistrationNumber: input.bizNo,
        ownerName: input.ownerName.trim(),
        businessStartDate: input.startDate,
      })
    : verifyBizNo(input)

/** 사업자 확인 (매장 등록 · 매장 추가 전에) */
export function useVerifyBizNo() {
  return useMutation({ mutationFn: postBizVerification })
}
