import { toDateKey } from '@/lib/date'
import type { OwnerNotification } from '@/pages/owner/api/types'

// 사장님 알림: 같은 매장 · 같은 근무일 인수인계 알림을 한 줄로 묶는다 (QA 11/15: 여러 개 남기면 알림이 여러 개 와서).
// BE 는 노트마다 알림을 하나씩 만들어서 화면에서 묶는다. 다른 종류 알림은 그대로, 순서는 묶음의 가장 최근 알림 자리

/** 인수인계를 남긴 근무일: BE target.workDate(#54) · 없으면 알림이 온 날 */
export const handoverDay = (n: OwnerNotification) =>
  n.workDate ?? (n.createdAt ? toDateKey(new Date(n.createdAt)) : '')

/** "민수님이 인수인계를 남겼어요" → "민수" (BE 제목 모양) */
const authorOf = (n: OwnerNotification) => n.title.replace(/님이 인수인계를 남겼어요$/, '')

export function groupHandovers(list: OwnerNotification[]): OwnerNotification[] {
  const groups = new Map<string, OwnerNotification[]>()
  for (const n of list) {
    if (n.kind !== 'handover') continue
    const key = `${n.storeId}_${handoverDay(n)}`
    groups.set(key, [...(groups.get(key) ?? []), n])
  }
  const shown = new Set<string>()
  return list.flatMap((n) => {
    if (n.kind !== 'handover') return [n]
    const key = `${n.storeId}_${handoverDay(n)}`
    if (shown.has(key)) return []
    shown.add(key)
    const group = groups.get(key)!
    if (group.length === 1) return [{ ...n, groupedIds: [n.notificationId] }]
    // 가장 최근 알림을 대표로 (시간 · 요약), 남긴 사람은 겹치지 않게
    const latest = group.reduce((a, b) => ((b.createdAt ?? '') > (a.createdAt ?? '') ? b : a))
    const authors = [...new Set(group.map(authorOf))]
    return [
      {
        ...latest,
        notificationId: `group_${key}`,
        title: `인수인계 ${group.length}개가 왔어요`,
        sub: `${authors.join(' · ')} — ${latest.sub}`,
        isRead: group.every((g) => g.isRead),
        groupedIds: group.map((g) => g.notificationId),
      },
    ]
  })
}
