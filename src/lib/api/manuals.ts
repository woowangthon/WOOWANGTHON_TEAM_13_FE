import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getManual, getManuals } from '@/api/mocks/staff/api/manuals'
import { http, isRealApi } from '@/lib/api/source'
import type { Manual, ManualList } from '@/lib/api/types'

/*
 * 매뉴얼 훅 — 담당: 민지 (사장 화면도 import 해서 쓴다)
 * .env VITE_REAL_API 에 'manuals'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 4
 */

export const manualKeys = {
  list: (storeId: string) => ['stores', storeId, 'manuals'] as const,
  detail: (storeId: string, manualId: string) => ['stores', storeId, 'manuals', manualId] as const,
}

const fetchManuals = (storeId: string) =>
  isRealApi('manuals') ? http.get<ManualList>(`/stores/${storeId}/manuals`) : getManuals(storeId)
const fetchManual = (storeId: string, manualId: string) =>
  isRealApi('manuals')
    ? http.get<Manual>(`/stores/${storeId}/manuals/${manualId}`)
    : getManual(storeId, manualId)

export function useManuals(storeId: string) {
  return useQuery({
    queryKey: manualKeys.list(storeId),
    queryFn: () => fetchManuals(storeId),
  })
}

/** 매뉴얼 상세. fromList 면 목록에 있는 같은 매뉴얼(내용 전체가 들어 있음)로 바로 보여 주고 뒤에서 새로 받는다 */
export function useManual(storeId: string, manualId: string, { fromList = false } = {}) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: manualKeys.detail(storeId, manualId),
    queryFn: () => fetchManual(storeId, manualId),
    placeholderData: (): Manual | undefined =>
      fromList
        ? queryClient
            .getQueryData<ManualList>(manualKeys.list(storeId))
            ?.manuals.find((m) => m.manualId === manualId)
        : undefined,
  })
}
