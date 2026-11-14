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
// ◀ ▶ 로 매장 등록한 달부터 앞으로 12달(고정 근무표 기준 예상)까지 넘겨 본다 (QA 11/15). 등록일을 모르면 지난달은 끝없이
// 데스크톱(lg): 위 요약 카드 3개(합계 · 공제 합계 · 지급일) + 직원별 표(이름 · 근무 · 주휴 · 세전 · 실수령), 행을 누르면 상세 대화창
/** 앞으로 볼 수 있는 달 수 (고정 근무표 기준 예상) */
const MAX_AHEAD = 12

/** 가장 먼저 등록한 매장의 등록 달 − 이번 달 (0 이하). 등록일을 모르면 끝없이 */
function earliestOffset(stores: { createdAt?: string | null }[], today: Date) {
  const times = stores.flatMap((s) => (s.createdAt ? [new Date(s.createdAt)] : []))
  if (times.length < stores.length || times.length === 0) return -Infinity
  const first = new Date(Math.min(...times.map((t) => t.getTime())))
  return Math.min(
    0,
    (first.getFullYear() - today.getFullYear()) * 12 + first.getMonth() - today.getMonth(),
  )
}

export default function OwnerPayrollPage() {
  const { store, stores, today } = useOwnerStore()
  // 처음에는 지금 매장. 'all' 이면 모든 매장
  const [picked, setScope] = useState<string | null>(null)
  const scope = picked ?? store.storeId
  const [openId, setOpenId] = useState<string | null>(null)
  // 0 = 이번 달 · -1 = 지난달 · 1 = 다음 달 (앞으로 MAX_AHEAD 달까지)
  const [wantedOffset, setOffset] = useState(0)
  const targets = scope === 'all' ? stores : stores.filter((s) => s.storeId === scope)
  const effective = targets.length ? targets : [store]
  // 보는 매장 중 가장 먼저 등록한 달까지만 뒤로 (전체면 가장 오래된 매장). 매장을 바꿔 범위 밖이면 그 끝 달로
  const minOffset = earliestOffset(effective, today)
  const offset = Math.min(MAX_AHEAD, Math.max(minOffset, wantedOffset))
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const month = toDateKey(base).slice(0, 7)
  // 어느 달 급여인지 늘 연도까지 (QA 11/15: 달만 보면 몇 년 것인지 헷갈린다)
  const monthLabel = `${base.getFullYear()}년 ${base.getMonth() + 1}월`

  // 매장마다 급여를 불러온다 (전체면 모든 매장)
  const results = useStorePayrolls(
    effective.map((s) => s.storeId),
    month,
  )
  const pending = results.some((r) => r.isPending)
  const members = results.flatMap((r) => r.data?.members ?? [])
  const total = members.reduce((sum, m) => sum + m.total, 0)
  const deduction = members.reduce((sum, m) => sum + m.deduction, 0)
  // 금액 카드 아래 내역 3칸 (알바 예상 급여 카드와 같은 모양): 근무 시간 · 기본급 / 주휴수당 / 공제
  const hours = members.reduce((sum, m) => sum + m.hours, 0)
  const basePay = members.reduce((sum, m) => sum + m.basePay, 0)
  const weeklyAllowance = members.reduce((sum, m) => sum + m.weeklyAllowance, 0)
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
              // 알바 예상 급여 매장 칩과 같게: 흰 바탕 위 옅은 테두리 (고른 칩은 매장 색 그대로, 11/14)
              className={cn(
                'h-10 border px-4 py-0 text-[15px] font-bold',
                scope === s.storeId ? 'border-transparent' : 'border-line/60',
              )}
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
                disabled={offset <= minOffset}
                onClick={() => setOffset(offset - 1)}
                className="flex size-8 items-center justify-center rounded-full bg-white/15 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="다음 달"
                disabled={offset >= MAX_AHEAD}
                onClick={() => setOffset(offset + 1)}
                className="flex size-8 items-center justify-center rounded-full bg-white/15 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </span>
          </div>
          <span className="text-[40px] font-extrabold tracking-[-0.03em]">
            {pending ? '—' : formatWon(total)}
          </span>
          <span className="text-[13px] opacity-75 lg:hidden">세전 · {payNote(single)}</span>
          {!pending && (
            <div className="mt-3 grid grid-cols-[auto_1fr_1fr] border-t border-white/15 pt-3 lg:hidden">
              <PayTile label={`${hours}시간 근무`} value={formatWon(basePay)} />
              <PayTile label="주휴수당" value={`+ ${formatWon(weeklyAllowance)}`} />
              <PayTile label="공제" value={deduction ? `− ${formatWon(deduction)}` : '0원'} />
            </div>
          )}
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
                className="grid grid-cols-[2fr_1.6fr_1.2fr_1.2fr] items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-left border border-line/60 transition-colors hover:border-line"
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
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {m.hours}시간 · 주휴 {m.weeklyAllowance ? formatWon(m.weeklyAllowance) : '없음'}
                </span>
                <span className="text-right text-[13px] text-muted-foreground tabular-nums">
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
                  className="flex w-full items-center gap-3 rounded-[22px] bg-card px-4 py-3.5 text-left border border-line/60"
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

      {open && <PaySheet pay={open} onClose={() => setOpenId(null)} monthLabel={monthLabel} />}
    </div>
  )
}

/** 데스크톱 요약 카드 (공제 합계 · 지급일) */
function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="hidden flex-col gap-2 rounded-[24px] bg-card p-5 border border-line/60 lg:flex">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[26px] font-extrabold tracking-[-0.03em] tabular-nums">{value}</span>
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

function PaySheet({
  pay,
  monthLabel,
  onClose,
}: {
  pay: MemberPay
  monthLabel: string
  onClose: () => void
}) {
  return (
    <BottomSheet open onClose={onClose} label={`${pay.name} 급여`} closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted-foreground">
            {pay.name} · {monthLabel} 실수령 · 참고용
          </span>
          <span className="text-[26px] font-extrabold tracking-[-0.03em]">
            {formatWon(pay.netPay)}
          </span>
        </div>
        <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
          <div className="flex justify-between border-b border-border py-[13px] text-[15px]">
            <dt className="text-muted-foreground">기본급 · {pay.hours}시간</dt>
            <dd className="m-0 font-bold">{formatWon(pay.basePay)}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-[13px] text-[15px]">
            <dt className="text-muted-foreground">주휴수당</dt>
            <dd className="m-0 font-bold">+ {formatWon(pay.weeklyAllowance)}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-[13px] text-[15px]">
            <dt className="text-muted-foreground">세전 합계</dt>
            <dd className="m-0 font-bold">{formatWon(pay.total)}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-[13px] text-[15px]">
            <dt className="text-muted-foreground">공제 · {TAX_LABEL[pay.taxType]}</dt>
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
                'flex items-center justify-between rounded-2xl px-4 py-3 text-[15px]',
                w.eligible ? 'bg-accent' : 'bg-background',
              )}
            >
              <span>
                {formatDate(fromDateKey(w.weekStart))} 주 · {w.hours}시간
              </span>
              <span className={cn('font-bold', w.eligible ? 'text-brand' : 'text-faint')}>
                {w.eligible ? '주휴 포함' : '15시간 미만'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}

/** 금액 카드 아래 내역 한 칸: 상자 없이 칸 사이 옅은 세로선 (알바 예상 급여 PayTile 과 같은 모양) */
function PayTile({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1 px-2 first:pl-0 last:pr-0 [&+&]:border-l [&+&]:border-white/15">
      <span className="text-xs font-medium whitespace-nowrap text-white/75 tabular-nums">
        {label}
      </span>
      <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">{value}</span>
    </span>
  )
}
