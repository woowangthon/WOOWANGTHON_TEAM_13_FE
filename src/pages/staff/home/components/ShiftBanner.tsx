import { ChevronDown, Clock } from 'lucide-react'
import { useState } from 'react'
import { useNotifications } from '@/lib/api/notifications'
import { fromDateKey, isSameDay, todayInKst } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { HANDOVER_TAG_LABEL, HANDOVER_TAG_PILL } from '@/shared/icons'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/utils'

// 출근 전 인수인계 배너 (홈 맨 위): 출근 30분 전 ~ 근무 끝까지 알림 API 의 banner 가 오면
// "오늘 18:00 출근 · 체크 안 된 인수인계 3개" — 펼치면 항목(태그 · 내용 · 작성자), [인수인계 보기]는 홈 인수인계로.
// 항목은 BE 가 최근 7일 것을 모아서, [인수인계 보기]는 가장 최근 체크 안 된 항목이 있는 날을 골라 내려간다 (QA 11/15: 늘 오늘로 가던 것)
// 옅은 카드 + 진한 글자 (docs/08: 진한 덩어리는 한 화면 1개 — 홈은 오늘 근무 사진 카드)
export function ShiftBanner({
  storeId,
  today,
  onShowHandover,
}: {
  storeId: string
  today: Date
  /** [인수인계 보기]: 홈 인수인계에서 이 날(YYYY-MM-DD)을 골라 둔다 */
  onShowHandover?: (date: string) => void
}) {
  const banner = useNotifications(storeId).data?.banner
  const [open, setOpen] = useState(false)
  if (!banner) return null

  const workDate = fromDateKey(banner.workDate)
  const dayText =
    isSameDay(workDate, today) || isSameDay(workDate, todayInKst()) ? '오늘' : formatDate(workDate)
  const goToHandover = () => {
    // 항목은 근무일 최신 순이라 첫 항목의 날 (없으면 출근하는 날)
    onShowHandover?.(banner.items[0]?.workDate ?? banner.workDate)
    // 날짜를 바꾼 화면이 그려진 뒤 내려간다
    setTimeout(() =>
      document
        .getElementById('today-handover')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-3 px-4 py-4 text-left"
      >
        <Clock aria-hidden="true" className="size-5 shrink-0 text-brand" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold tabular-nums">
            {dayText} {banner.startTime} 출근
          </span>
          <span className="text-[13px] font-medium text-muted-foreground">
            {banner.uncheckedCount > 0
              ? `체크 안 된 인수인계 ${banner.uncheckedCount}개`
              : '인수인계를 모두 확인했어요'}
          </span>
        </span>
        {banner.items.length > 0 && (
          <ChevronDown
            className={cn(
              'size-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        )}
      </button>
      {open && banner.items.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line/60 px-4 pt-3 pb-4 animate-in duration-200 fade-in-0 motion-reduce:animate-none">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {banner.items.map((item) => {
              const [bg, fg] = HANDOVER_TAG_PILL[item.tag] ?? HANDOVER_TAG_PILL.etc
              return (
                <li key={item.itemId} className="flex items-start gap-2.5">
                  <span
                    className="mt-px shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: bg, color: fg }}
                  >
                    {HANDOVER_TAG_LABEL[item.tag] ?? '기타'}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] leading-[1.45] break-keep">{item.text}</span>
                    {/* 최근 7일 것이 모여서, 오늘 것이 아니면 날짜도 (QA 11/15) */}
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.workDate === banner.workDate
                        ? item.authorName
                        : `${item.authorName} · ${formatDate(fromDateKey(item.workDate))}`}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
          <Button variant="soft" size="sm" className="self-start" onClick={goToHandover}>
            인수인계 보기
          </Button>
        </div>
      )}
    </section>
  )
}
