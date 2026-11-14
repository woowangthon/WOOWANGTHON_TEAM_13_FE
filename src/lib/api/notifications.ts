import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getNotifications, readNotifications } from '@/api/mocks/staff/api/notifications'
import { http, isRealApi } from '@/lib/api/source'
import type { NotificationFeed } from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'

/*
 * 알림 훅 — 담당: 민지 (알바 · 사장님 같이 쓸 수 있게 storeId 만 받는다)
 * BE feature_notifications(연서): GET /stores/{storeId}/notifications → { banner, notifications, unreadCount } (최근 14일 · 내 역할 것만)
 *   POST /stores/{storeId}/notifications/read → 204, 지금까지 전부 읽음
 * 민지 결정(11/11): 알림 화면을 열면 전부 읽음 · 출근 30분 전 요약은 앱 안 홈 배너(푸시 X, AI 없이 체크 안 된 항목) ·
 *   화면에 들어올 때 + 1분마다 다시 부르기
 * .env VITE_REAL_API 에 'notifications'를 넣으면 진짜 API, 아니면 가짜 서버(api/mocks/staff/api/notifications). docs/07 10
 */

export const notificationKeys = {
  feed: (storeId: string) => ['stores', storeId, 'notifications'] as const,
}

const EMPTY: NotificationFeed = { banner: null, notifications: [], unreadCount: 0 }
const REFRESH_MS = 60_000

const real = () => isRealApi('notifications')

async function fetchFeed(storeId: string): Promise<NotificationFeed> {
  if (!real()) return getNotifications(storeId)
  try {
    return await http.get<NotificationFeed>(`/stores/${storeId}/notifications`)
  } catch (error) {
    // 알림 API 가 아직 main 에 없을 때(404)는 알림 없음으로 (헤더 · 홈이 깨지지 않게)
    if (error instanceof ApiError && error.status === 404) return EMPTY
    throw error
  }
}

/** 알림 · 출근 전 배너 · 안 읽은 수 (1분마다 · 화면에 돌아올 때 다시 부른다) */
export function useNotifications(storeId: string) {
  return useQuery({
    queryKey: notificationKeys.feed(storeId),
    queryFn: () => fetchFeed(storeId),
    enabled: !!storeId,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  })
}

/** 지금까지 알림 전부 읽음 — 뱃지는 바로 0, 목록 점은 다시 불러오면 사라진다 */
export function useReadNotifications(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      real()
        ? http.post<void>(`/stores/${storeId}/notifications/read`)
        : readNotifications(storeId),
    onSuccess: () =>
      queryClient.setQueryData<NotificationFeed>(notificationKeys.feed(storeId), (old) =>
        old ? { ...old, unreadCount: 0 } : old,
      ),
  })
}
