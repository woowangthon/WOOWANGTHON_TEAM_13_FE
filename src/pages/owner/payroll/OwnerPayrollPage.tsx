import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { fromDateKey, toDateKey } from '@/lib/date'
import { formatDate, formatWon } from '@/lib/format'
import type { MemberPay } from '@/pages/owner/api/types'
import { useStorePayrolls } from '@/pages/owner/api/work'
import { TAX_LABEL } from '@/pages/owner/payroll/tax'
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
// 합계는 세전(사장님이 쓰는 인건비), 직원 줄 · 시트는 공제(4대보험 · 3.3%, 직원 상세에서 설정) 뒤 실수령까지
// ◀ ▶ 로 지난달 · 다음 달(확정 근무표 기준 예상)까지 넘겨 본다
// 데스크톱(lg): 위 요약 카드 3개(합계 · 공제 합계 · 지급일) + 직원별 표(이름 · 근무 · 주휴 · 세전 · 실수령), 행을 누르면 상세 대화창
export default function OwnerPayrollPage() {
  const { store, stores, today } = useOwnerStore()
  // 처음에는 지금 매장. 'all' 이면 모든 매장
  const [picked, setScope] = useState<string | null>(null)
  const scope = picked ?? store.storeId
  const [openId, setOpenId] = useState<string | null>(null)
  // 0 = 이번 달 · -1 = 지난달 · 1 = 다음 달 (다음 달까지만)
  const [offset, setOffset] = useState(0)
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const month = toDateKey(base).slice(0, 7)
  const monthLabel = `${base.getFullYear() !== today.getFullYear() ? `${base.getFullYear()}년 ` : ''}${base.getMonth() + 1}월`
  const targets = scope === 'all' ? stores : stores.filter((s) => s.storeId === scope)
  const effective = targets.length ? targets : [store]

  // 매장마다 급여를 불러온다 (전체면 모든 매장)
  const results = useStorePayrolls(
    effective.map((s) => s.storeId),
    month,
  )
  const pending = results.some((r) => r.isPending)
  const members = results.flatMap((r) => r.data?.members ?? [])
  const total = members.reduce((sum, m) => sum + m.total, 0)
  const deduction = members.reduce((sum, m) => sum + m.deduction, 0)
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

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-3.5">
        <Card variant="dark" className="gap-2 p-6 lg:rounded-[24px] lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] opacity-80">{monthLabel} 급여 합계 · 참고용</span>
            <span className="flex gap-1.5">
              <button
                type="button"
                aria-label="지난달"
                onClick={() => setOffset(offset - 1)}
                className="flex size-8 items-center justify-center rounded-full bg-white/15"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="다음 달"
                disabled={offset >= 1}
                onClick={() => setOffset(offset + 1)}
                className="flex size-8 items-center justify-center rounded-full bg-white/15 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </span>
          </div>
          <span className="text-[38px] font-extrabold tracking-[-0.03em] lg:text-[32px]">
            {pending ? '—' : formatWon(total)}
          </span>
          <span className="text-[13px] opacity-75 lg:hidden">
            {!pending && deduction > 0 && `세전 · 공제 합계 ${formatWon(deduction)} · `}
            {payNote(single)}
          </span>
          <span className="hidden text-[13px] opacity-75 lg:block">세전 · 주휴수당 포함</span>
        </Card>
        {/* 데스크톱 요약 카드 2 · 3 */}
        <SummaryCard
          label={`${monthLabel} 공제 합계`}
          value={pending ? '—' : formatWon(deduction)}
          sub="4대보험 · 3.3% (직원별)"
        />
        <SummaryCard
          label="지급일"
          value={
            single ? (single.payday === 31 ? '매월 말일' : `매월 ${single.payday}일`) : '매장마다'
          }
          sub={
            single
              ? `${single.size === 'under5' ? '5인 미만' : '5인 이상'} · 주휴수당 포함`
              : '주휴수당 포함 · 공휴일 가산 없음'
          }
        />
      </div>

      {pending ? (
        <Spinner />
      ) : members.length === 0 ? (
        <EmptyGuide
          message={`${monthLabel}에는 급여를 계산할 근무가 없어요`}
          hint="알바생이 근무하면 직원별 급여가 여기에 보여요"
        />
      ) : (
        <>
          {/* 데스크톱: 직원별 표 */}
          <section className="hidden flex-col gap-1.5 rounded-[28px] bg-card p-4 lg:flex">
            <div className="grid grid-cols-[2fr_1.6fr_1.2fr_1.2fr] gap-3 px-4 pt-1 pb-2 text-xs font-bold text-muted-foreground">
              <span>이름</span>
              <span>근무 · 주휴</span>
              <span className="text-right">세전</span>
              <span className="text-right">실수령</span>
            </div>
            {members.map((m, i) => (
              <button
                key={m.memberId}
                type="button"
                onClick={() => setOpenId(m.memberId)}
                className="grid grid-cols-[2fr_1.6fr_1.2fr_1.2fr] items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-left shadow-soft transition-shadow hover:shadow-float"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PersonAvatar name={m.name} index={i} size={38} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-bold">{m.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {scope === 'all'
                        ? `${stores.find((s) => s.storeId === m.storeId)?.name} · ${TAX_LABEL[m.taxType]}`
                        : TAX_LABEL[m.taxType]}
                    </span>
                  </span>
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {m.hours}시간 · 주휴 {m.weeklyAllowance ? formatWon(m.weeklyAllowance) : '없음'}
                </span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">
                  {formatWon(m.total)}
                </span>
                <span className="text-right text-base font-extrabold tabular-nums">
                  {formatWon(m.netPay)}
                </span>
              </button>
            ))}
          </section>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
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
                      {m.hours}시간 · 주휴{' '}
                      {m.weeklyAllowance ? formatWon(m.weeklyAllowance) : '없음'} ·{' '}
                      {TAX_LABEL[m.taxType]}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-extrabold whitespace-nowrap">
                      {formatWon(m.netPay)}
                    </span>
                    {m.deduction > 0 && (
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        세전 {formatWon(m.total)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && <PaySheet pay={open} onClose={() => setOpenId(null)} month={base.getMonth() + 1} />}
    </div>
  )
}

/** 데스크톱 요약 카드 (공제 합계 · 지급일) */
function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="hidden flex-col gap-2 rounded-[24px] bg-card p-5 shadow-soft lg:flex">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[28px] font-extrabold tracking-[-0.03em] tabular-nums">{value}</span>
      <span className="mt-auto text-[13px] text-muted-foreground">{sub}</span>
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
            {pay.name} · {month}월 실수령 · 참고용
          </span>
          <span className="text-[32px] font-extrabold tracking-[-0.03em]">
            {formatWon(pay.netPay)}
          </span>
        </div>
        <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
          <div className="flex justify-between border-b border-[#F0EBE2] py-[13px] text-[15px]">
            <dt className="text-[#6B7068]">기본급 · {pay.hours}시간</dt>
            <dd className="m-0 font-bold">{formatWon(pay.basePay)}</dd>
          </div>
          <div className="flex justify-between border-b border-[#F0EBE2] py-[13px] text-[15px]">
            <dt className="text-[#6B7068]">주휴수당</dt>
            <dd className="m-0 font-bold">+ {formatWon(pay.weeklyAllowance)}</dd>
          </div>
          <div className="flex justify-between border-b border-[#F0EBE2] py-[13px] text-[15px]">
            <dt className="text-[#6B7068]">세전 합계</dt>
            <dd className="m-0 font-bold">{formatWon(pay.total)}</dd>
          </div>
          <div className="flex justify-between border-b border-[#F0EBE2] py-[13px] text-[15px]">
            <dt className="text-[#6B7068]">공제 · {TAX_LABEL[pay.taxType]}</dt>
            <dd className="m-0 font-bold">- {formatWon(pay.deduction)}</dd>
          </div>
          <div className="flex justify-between py-[13px] text-[15px]">
            <dt className="font-bold">실수령</dt>
            <dd className="m-0 font-extrabold text-brand">{formatWon(pay.netPay)}</dd>
          </div>
        </dl>
        <span className="px-1 text-xs text-muted-foreground">
          {pay.taxType === 'ins'
            ? '4대보험 근로자 부담분만 뺐어요 (근로소득세는 빠져 있어요)'
            : '공제 종류는 직원 › 직원 상세에서 바꿀 수 있어요'}
        </span>
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
