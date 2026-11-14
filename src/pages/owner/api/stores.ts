import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStore,
  deleteStore,
  getOwnerStores,
  getProfile,
  updateProfile,
  updateStore,
  uploadStorePhoto,
  verifyBizNo,
} from '@/api/mocks/owner/api'
import { getShiftTemplates, putFixedSchedule } from '@/api/mocks/owner/schedule'
import { http, isRealApi } from '@/lib/api/source'
import { apiFetch } from '@/lib/apiClient'
import { useAuthStore, type Me } from '@/lib/authStore'
import type {
  BizVerification,
  BizVerifyInput,
  BusinessSize,
  NewStore,
  OwnerStore,
  ShiftTemplate,
  StoreResponse,
  StoreSize,
  StoreUpdate,
} from '@/pages/owner/api/types'

/*
 * 사장님 매장 · 프로필 훅 — 담당: 나현
 * .env VITE_REAL_API 에 'stores'를 넣으면 매장은 진짜 API(/stores), 아니면 가짜 서버(api/mocks/owner) — lib/api/source.
 * 사업자 확인도 'stores'를 따른다 (POST /stores/business-verifications, 국세청 상태조회 → 매장 등록에 verificationId).
 */

/** 사업장 규모: 화면 under5 · over5 ↔ BE UNDER_FIVE · FIVE_OR_MORE */
/** BE 가 급여일을 안 정했을 때 · 매장 등록 휠 처음 값 */
export const DEFAULT_PAYDAY = 10

const toBusinessSize = (size: StoreSize): BusinessSize =>
  size === 'over5' ? 'FIVE_OR_MORE' : 'UNDER_FIVE'

/** 급여일을 안 정한 매장(null)은 화면에서 10일로 보여 준다 (저장하면 그 값이 들어간다) */

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
  closedWeekdays: store.closedWeekdays ?? [],
  closedOnHolidays: store.closedOnHolidays ?? false,
  createdAt: store.createdAt ?? null,
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
    payday: input.payday,
    businessVerificationId: input.businessVerificationId,
    shiftTemplates: input.shiftTemplates.map((t, i) => ({ ...t, sortOrder: i })),
    closedWeekdays: input.closedWeekdays,
    closedOnHolidays: input.closedOnHolidays,
  })
  return toOwnerStore(store)
}

// 이름 · 급여일 · 사업장 규모 · 쉬는 날 (BE #27 · #38). 급여일은 1~31 (31 = 말일)
const patchStore = async (storeId: string, patch: StoreUpdate): Promise<OwnerStore> => {
  if (!isRealApi('stores')) return updateStore(storeId, patch)
  const store = await http.patch<StoreResponse>(`/stores/${storeId}`, {
    name: patch.name,
    payday: patch.payday,
    businessSize: patch.size && toBusinessSize(patch.size),
    photoUrl: patch.photoUrl,
    closedWeekdays: patch.closedWeekdays,
    closedOnHolidays: patch.closedOnHolidays,
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

const fetchShiftTemplates = async (storeId: string): Promise<ShiftTemplate[]> => {
  const { templates } = isRealApi('stores')
    ? await http.get<{ templates: ShiftTemplate[] }>(`/stores/${storeId}/shift-templates`)
    : await getShiftTemplates(storeId)
  return templates
}

/*
 * 사장님 본인 고정 근무 저장 (온보딩 ④): 매장을 막 만들어서 고정 스케줄에는 사장님만 있다.
 * 근무 타임은 이름으로 고르고(매장 만들기 전이라 아이디가 없음), 사장님 userId 는 근무자 목록의 owner
 * PUT /fixed-schedule 은 매장 전체를 바꾸므로 직원이 생긴 뒤에는 쓰지 않는다
 * 매장과 함께 만든 것이라 진짜/가짜는 'stores'를 따른다
 */
const saveOwnerShifts = async (
  storeId: string,
  shifts: { templateName: string; weekday: number }[],
) => {
  const templates = await fetchShiftTemplates(storeId)
  const idOf = (name: string) => templates.find((t) => t.name === name)?.templateId
  if (!isRealApi('stores')) {
    const assignments = shifts.map((s) => ({
      templateId: idOf(s.templateName)!,
      weekday: s.weekday,
      userId: 'owner',
    }))
    return putFixedSchedule(storeId, assignments)
  }
  const { workers } = await http.get<{ workers: { userId: string; role: 'owner' | 'staff' }[] }>(
    `/stores/${storeId}/schedule-workers`,
  )
  const ownerId = workers.find((w) => w.role === 'owner')?.userId
  await apiFetch(`/stores/${storeId}/fixed-schedule`, {
    method: 'PUT',
    body: JSON.stringify({
      assignments: shifts.map((s) => ({
        templateId: idOf(s.templateName),
        weekday: s.weekday,
        assigneeUserId: ownerId,
      })),
    }),
  })
}

// 매장 사진: 올려서 주소를 받고(POST /stores/{storeId}/photo, 파일 칸 image) 매장 photoUrl 로 저장
const saveStorePhoto = async (storeId: string, file: File): Promise<OwnerStore> => {
  if (!isRealApi('stores')) {
    const { photoUrl } = await uploadStorePhoto(storeId, file)
    return updateStore(storeId, { photoUrl })
  }
  const form = new FormData()
  form.append('image', file)
  const { photoUrl } = await apiFetch<{ photoUrl: string }>(`/stores/${storeId}/photo`, {
    method: 'POST',
    body: form,
  })
  return patchStore(storeId, { photoUrl })
}

/** 매장 등록 (온보딩 · 마이페이지 매장 추가) */
export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postStore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.stores }),
  })
}

/** 사장님 본인 고정 근무 (온보딩 ④) */
export function useSaveOwnerShifts() {
  return useMutation({
    mutationFn: ({
      storeId,
      shifts,
    }: {
      storeId: string
      shifts: { templateName: string; weekday: number }[]
    }) => saveOwnerShifts(storeId, shifts),
  })
}

/** 매장 사진 올리기 (온보딩 ④) */
export function useSaveStorePhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, file }: { storeId: string; file: File }) =>
      saveStorePhoto(storeId, file),
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

// 사업자 확인: 번호만 → 국세청 상태조회, 계속사업자면 VERIFIED (휴업 · 폐업 · 미등록은 INVALID, 에러 아님 · BE #40)
const postBizVerification = (input: BizVerifyInput): Promise<BizVerification> =>
  isRealApi('stores')
    ? http.post<BizVerification>('/stores/business-verifications', {
        businessRegistrationNumber: input.bizNo,
      })
    : verifyBizNo(input)

/** 사업자 확인 (매장 등록 · 매장 추가 전에) */
export function useVerifyBizNo() {
  return useMutation({ mutationFn: postBizVerification })
}
