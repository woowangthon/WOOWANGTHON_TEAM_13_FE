import { useQuery } from '@tanstack/react-query'
import { getManual, getManuals } from '@/api/mocks/staff/api/manuals'
import { retryExceptNotFound } from '@/lib/api/query'

/*
 * 매뉴얼 훅 — 담당: 민지 (사장 화면도 import 해서 쓴다)
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만
 * apiFetch(`/stores/${storeId}/manuals`) 또는 orval 생성 함수로 바꾸면 된다. 응답 모양: docs/07 4
 */

export const manualKeys = {
  list: (storeId: string) => ['stores', storeId, 'manuals'] as const,
  detail: (storeId: string, manualId: string) => ['stores', storeId, 'manuals', manualId] as const,
}

const fetchManuals = (storeId: string) => getManuals(storeId)
const fetchManual = (storeId: string, manualId: string) => getManual(storeId, manualId)

export function useManuals(storeId: string) {
  return useQuery({
    queryKey: manualKeys.list(storeId),
    queryFn: () => fetchManuals(storeId),
  })
}

export function useManual(storeId: string, manualId: string) {
  return useQuery({
    queryKey: manualKeys.detail(storeId, manualId),
    queryFn: () => fetchManual(storeId, manualId),
    retry: retryExceptNotFound,
  })
}
