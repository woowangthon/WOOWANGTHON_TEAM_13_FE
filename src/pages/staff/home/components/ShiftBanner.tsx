import { ChevronDown, Clock } from 'lucide-react'
import { useState } from 'react'
import { useNotifications } from '@/lib/api/notifications'
import { fromDateKey, isSameDay, todayInKst } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { HANDOVER_TAG_LABEL, HANDOVER_TAG_PILL } from '@/shared/icons'
import { cn } from '@/ui/utils'

// 출근 전 인수인계 배너 (홈 맨 위): 출근 30분 전 ~ 근무 끝까지 알림 API 의 banner 가 오면
// "오늘 18:00 출근 · 체크 안 된 인수인계 3개" — 펼치면 항목(태그 · 내용 · 작성자), [인수인계 보기]는 홈의 오늘의 인수인계로
export function ShiftBanner({ storeId, today }: { storeId: string; today: Date }) {
  const banner = useNotifications(storeId).data?.banner
  const [open, setOpen] = useState(false)
  if (!banner) return null

  const workDate = fromDateKey(banner.workDate)
  const dayText =
    isSameDay(workDate, today) || isSameDay(workDate, todayInKst()) ? '오늘' : formatDate(workDate)
  const goToHandover = () =>
    document
      .getElementById('today-handover')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="flex flex-col overflow-hidden rounded-[22px] bg-ink text-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Clock className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold tabular-nums">
            {dayText} {banner.startTime} 출근
          </span>
          <span className="text-[13px] opacity-80">
            {banner.uncheckedCount > 0
              ? `체크 안 된 인수인계 ${banner.uncheckedCount}개`
              : '인수인계를 모두 확인했어요'}
          </span>
        </span>
        {banner.items.length > 0 && (
          <ChevronDown
            className={cn(
              'size-5 shrink-0 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        )}
      </button>
      {open && banner.items.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/10 px-4 pt-3 pb-4 animate-in duration-200 fade-in-0 motion-reduce:animate-none">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {banner.items.map((item) => {
              const [bg, fg] = HANDOVER_TAG_PILL[item.tag] ?? HANDOVER_TAG_PILL.etc
              return (
                <li key={item.itemId} className="flex items-start gap-2.5">
                  <span
                    className="mt-px shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: bg, color: fg }}
                  >
                    {HANDOVER_TAG_LABEL[item.tag] ?? '기타'}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm leading-snug break-keep">{item.text}</span>
                    <span className="text-xs opacity-70">{item.authorName}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={goToHandover}
            className="self-start rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-foreground"
          >
            인수인계 보기
          </button>
        </div>
      )}
    </section>
  )
}
