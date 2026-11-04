import { useState } from 'react'
import { fromDateKey } from '@/lib/date'
import { formatDate, formatWon } from '@/lib/format'
import type { MemberPay } from '@/pages/owner/api/types'
import { useStorePayrolls } from '@/pages/owner/api/work'
import { PersonAvatar } from '@/pages/owner/components/PersonAvatar'
import { WorkHeader } from '@/pages/owner/schedule/components/WorkHeader'
import { useOwnerStore, type OwnerStoreView } from '@/pages/owner/useOwnerStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { BottomSheet } from '@/ui/BottomSheet'
import { Card } from '@/ui/Card'
import { Chip } from '@/ui/Chip'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 직원별 급여 (P1, docs/03 S7): 매장별 · 전체 합계 → 직원 → 주별 근거. 주휴 포함 · 공휴일 가산 없음 · 참고용
export default function OwnerPayrollPage() {
  const { store, stores, today } = useOwnerStore()
  // 처음에는 지금 매장. 'all' 이면 모든 매장
  const [picked, setScope] = useState<string | null>(null)
  const scope = picked ?? store.storeId
  const [openId, setOpenId] = useState<string | null>(null)
  const targets = scope === 'all' ? stores : stores.filter((s) => s.storeId === scope)
  const effective = targets.length ? targets : [store]

  // 매장마다 급여를 불러온다 (전체면 모든 매장)
  const results = useStorePayrolls(effective.map((s) => s.storeId))
  const pending = results.some((r) => r.isPending)
  const members = results.flatMap((r) => r.data?.members ?? [])
  const total = members.reduce((sum, m) => sum + m.total, 0)
  const open = members.find((m) => m.memberId === openId)
  const single = scope === 'all' ? null : effective[0]

  return (
    <div className="flex flex-col gap-4">
      <WorkHeader segment="pay" />

      {stores.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-1">
          {[{ storeId: 'all', name: '전체' }, ...stores].map((s) => (
            <Chip
              key={s.storeId}
              active={scope === s.storeId}
              onClick={() => setScope(s.storeId)}
              className="px-4 text-sm font-bold"
            >
              {s.name}
            </Chip>
          ))}
        </div>
      )}

      <Card variant="dark" className="gap-2 p-6">
        <span className="text-[13px] opacity-80">{today.getMonth() + 1}월 급여 합계 · 참고용</span>
        <span className="text-[38px] font-extrabold tracking-[-0.03em]">
          {pending ? '—' : formatWon(total)}
        </span>
        <span className="text-[13px] opacity-75">{payNote(single)}</span>
      </Card>

      {pending ? (
        <Spinner />
      ) : members.length === 0 ? (
        <EmptyGuide
          message="아직 급여를 계산할 근무가 없어요"
          hint="알바생이 근무하면 직원별 급여가 여기에 보여요"
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {members.map((m, i) => (
            <li key={m.memberId}>
              <button
                type="button"
                onClick={() => setOpenId(m.memberId)}
                className="flex w-full items-center gap-3 rounded-[22px] bg-card px-4 py-3.5 text-left shadow-soft"
              >
                <PersonAvatar name={m.name} index={i} />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[15px] font-bold">
                    {m.name}
                    {scope === 'all' && (
                      <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                        {stores.find((s) => s.storeId === m.storeId)?.name}
                      </span>
                    )}
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {m.hours}시간 · 주휴 {m.weeklyAllowance ? formatWon(m.weeklyAllowance) : '없음'}
                  </span>
                </span>
                <span className="text-base font-extrabold whitespace-nowrap">
                  {formatWon(m.total)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <PaySheet pay={open} onClose={() => setOpenId(null)} month={today.getMonth() + 1} />}
    </div>
  )
}

function payNote(store: OwnerStoreView | null) {
  if (!store) return '주휴수당 포함 · 공휴일 가산 없음'
  const size = store.size === 'under5' ? '5인 미만' : '5인 이상'
  const day = store.payday === 31 ? '말일' : `${store.payday}일`
  return `주휴수당 포함 · ${size} 사업장 · 매월 ${day} 지급`
}

function PaySheet({ pay, month, onClose }: { pay: MemberPay; month: number; onClose: () => void }) {
  return (
    <BottomSheet open onClose={onClose} label={`${pay.name} 급여`} closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted-foreground">
            {pay.name} · {month}월 · 참고용
          </span>
          <span className="text-[32px] font-extrabold tracking-[-0.03em]">
            {formatWon(pay.total)}
          </span>
        </div>
        <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
          <div className="flex justify-between border-b border-[#F0EBE2] py-[13px] text-[15px]">
            <dt className="text-[#6B7068]">기본급 · {pay.hours}시간</dt>
            <dd className="m-0 font-bold">{formatWon(pay.basePay)}</dd>
          </div>
          <div className="flex justify-between py-[13px] text-[15px]">
            <dt className="text-[#6B7068]">주휴수당</dt>
            <dd className="m-0 font-bold">+ {formatWon(pay.weeklyAllowance)}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-base font-extrabold">주별</h3>
          {pay.weeks.map((w) => (
            <div
              key={w.weekStart}
              className={cn(
                'flex items-center justify-between rounded-2xl px-4 py-3 text-sm',
                w.eligible ? 'bg-accent' : 'bg-background',
              )}
            >
              <span>
                {formatDate(fromDateKey(w.weekStart))} 주 · {w.hours}시간
              </span>
              <span className={cn('font-bold', w.eligible ? 'text-brand' : 'text-[#9AA19C]')}>
                {w.eligible ? '주휴 포함' : '15시간 미만'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
