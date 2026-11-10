import { getHandoverNotes } from '@/api/mocks/staff/api/handover'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { toDateKey } from '@/lib/date'
import type { AppNotification, NotificationFeed, ShiftBanner } from '@/lib/api/types'

/*
 * 가짜 서버: 알림 API (docs/07 10) — BE feature_notifications 모양.
 * 시연(달빛 카페): 알바용 알림 3종(대타 요청 · 대타 구해짐 · 사장님 답변, 안 읽음 2개) +
 * 출근 전 배너(오늘 18:00 마감 근무 · 오늘 인수인계 중 체크 안 된 항목 — 홈에서 체크하면 줄어든다).
 * 읽음은 "마지막으로 읽은 시각" 하나로 정한다 (POST /read = 지금까지 전부 읽음).
 */

/** 지금부터 n분 전 (시연 알림 시각이 "3분 전"처럼 보이게) */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const seed: Record<string, AppNotification[]> = {
  dalbit: [
    {
      notificationId: 'ntf_sub_req_doyun',
      type: 'SUBSTITUTE_REQUESTED',
      title: '대타 요청이 왔어요',
      body: '도윤님이 11/24(화) 마감 18:00–23:00 근무 대타를 부탁했어요',
      createdAt: ago(5),
      isRead: false,
      target: { kind: 'substitute_request', id: 'sub_from_doyun' },
    },
    {
      notificationId: 'ntf_owner_answer_umbrella',
      type: 'OWNER_ANSWERED',
      title: '사장님이 답했어요',
      body: '손님이 우산 빌려 달래요',
      createdAt: ago(40),
      isRead: false,
      target: { kind: 'assistant_chat', id: 'cht_dalbit' },
    },
    {
      notificationId: 'ntf_sub_acc_minsu',
      type: 'SUBSTITUTE_ACCEPTED',
      title: '대타가 구해졌어요',
      body: '민수님이 11/25(수) 마감 18:00–23:00 근무를 대신해요',
      createdAt: ago(2 * 24 * 60),
      isRead: false,
      target: { kind: 'substitute_request', id: 'sub_to_minsu' },
    },
  ],
}

/** 매장별 마지막으로 읽은 시각 (시연: 대타 구해짐은 이미 읽음) */
const lastReadAt: Record<string, string> = { dalbit: ago(2 * 24 * 60 - 30) }

/** 시연 출근 근무 (달빛 카페: 오늘 18:00–23:00 마감) */
const SHIFT: Record<string, { start: string; end: string }> = {
  dalbit: { start: '18:00', end: '23:00' },
}

async function banner(storeId: string): Promise<ShiftBanner | null> {
  const shift = SHIFT[storeId]
  if (!shift) return null
  const workDate = toDateKey(findStaffStore(storeId).today)
  const { notes } = await getHandoverNotes(storeId, workDate)
  const items = notes.flatMap((note) =>
    note.items
      .filter((item) => !item.checked)
      .map((item) => ({
        noteId: note.noteId,
        itemId: item.itemId,
        tag: item.tag,
        text: item.text,
        authorName: note.author.name,
        workDate,
      })),
  )
  return {
    workDate,
    startTime: shift.start,
    endTime: shift.end,
    startsAt: `${workDate}T${shift.start}:00+09:00`,
    uncheckedCount: items.length,
    items,
  }
}

/** GET /stores/{storeId}/notifications */
export async function getNotifications(storeId: string): Promise<NotificationFeed> {
  const read = lastReadAt[storeId] ?? ''
  const notifications = (seed[storeId] ?? [])
    .map((n) => ({ ...n, isRead: n.createdAt <= read }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return {
    banner: await banner(storeId),
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  }
}

/** POST /stores/{storeId}/notifications/read — 지금까지 알림 전부 읽음 (204) */
export async function readNotifications(storeId: string): Promise<void> {
  lastReadAt[storeId] = '9999-12-31T00:00:00+09:00'
}
