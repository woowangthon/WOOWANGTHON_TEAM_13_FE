import { addDays } from '@/lib/date'
import { formatDate } from '@/lib/format'

// 고정 근무 · 근무 타임을 바꾸면 BE 가 다음 날(한국 시간)부터 적용한다 — 오늘 · 지난 근무와 대타 기록은 그대로 (BE #53, 팀 결정 11/15)

/** 저장 버튼 위 안내: "11/21(토)부터 바뀌어요 · 오늘까지 근무는 그대로예요" */
export const fromTomorrowNotice = (today: Date) =>
  `${formatDate(addDays(today, 1))}부터 바뀌어요 · 오늘까지 근무는 그대로예요`
