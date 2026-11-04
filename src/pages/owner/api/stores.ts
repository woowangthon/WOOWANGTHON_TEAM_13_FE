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
import type { OwnerStore, StoreSize } from '@/pages/owner/api/types'

/*
 * 사장님 매장 · 프로필 훅 (임시) — 담당: 나현
 * src/lib/api 와 같은 모양으로 만들어 두고, 사장님 API 가 정해지면 lib/api 로 옮긴다 (민지와 상의).
 * 지금은 가짜 서버(api/mocks/owner)를 부른다.
 */

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
  return useQuery({ queryKey: ownerKeys.stores, queryFn: getOwnerStores })
}

export function useOwnerProfile() {
  return useQuery({ queryKey: ownerKeys.profile, queryFn: getProfile })
}

export function useUpdateOwnerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(ownerKeys.profile, profile),
  })
}

/** 매장 등록 (온보딩 · 마이페이지 매장 추가) */
export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; size: StoreSize; bizNo?: string | null }) =>
      createStore(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.stores }),
  })
}

export function useUpdateStore(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Pick<OwnerStore, 'name' | 'payday' | 'size'>>) =>
      updateStore(storeId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.stores }),
  })
}

export function useDeleteStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.all }),
  })
}

/** 사업자등록번호 확인 (P2: 국세청 상태조회) */
export function useVerifyBizNo() {
  return useMutation({ mutationFn: verifyBizNo })
}
