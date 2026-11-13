import { toDateKey } from '@/lib/date'
import { formatWon } from '@/lib/format'
import { useFixedSchedule } from '@/pages/owner/api/fixedSchedule'
import { useMembers } from '@/pages/owner/api/members'
import type { Member } from '@/pages/owner/api/types'
import { useStorePayroll } from '@/pages/owner/api/work'
import { PersonAvatar } from '@/pages/owner/components/PersonAvatar'
import { InviteCodeCard } from '@/pages/owner/members/components/InviteCodeCard'
import { WEEKDAY_LABELS } from '@/pages/owner/store/shifts'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { cn } from '@/ui/utils'

// 데스크톱 직원 탭 오른쪽 칸: 고른 직원 정보 — 이름 · 근무 한 줄 · [정보 수정](초대코드 · 시급 · 공제 · 퇴사 대화창)
// 시급 · 이번 달 근무 시간 · 이번 달 급여(실수령) · 고정 근무 요일 · 공제 · 지급일. 입장 전이면 급여 대신 초대코드
export function MemberSummary({ member, onEdit }: { member: Member; onEdit: () => void }) {
  const { store, today } = useOwnerStore()
  const members = useMembers(member.storeId).data?.members ?? []
  const month = toDateKey(today).slice(0, 7)
  const pay = useStorePayroll(member.storeId, month).data?.members.find(
    (m) => m.memberId === member.memberId,
  )
  const fixed = useFixedSchedule(member.storeId).data ?? []
  const active = member.status === 'active'
  // 목록과 같은 색 (목록 순서)
  const index = Math.max(
    0,
    members.findIndex((m) => m.memberId === member.memberId),
  )
  // 고정 근무 요일: 입장한 직원만 (입장 전 · 초대됨은 전부 비활성)
  const weekdays = new Set(
    active
      ? fixed
          // 가짜 서버는 근무표 쪽 memberId 가 달라서(mbr_usr_…) 이름으로도 맞춘다 (BE 는 같은 memberId)
          .filter((a) => a.assignee.memberId === member.memberId || a.assignee.name === member.name)
          .map((a) => a.weekday)
      : [],
  )
  const monthLabel = `${today.getMonth() + 1}월`

  return (
    <section className="flex flex-col gap-5 rounded-[28px] bg-card p-7 shadow-soft">
      <div className="flex items-center gap-4">
        <PersonAvatar name={member.name} index={index} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">{member.name}</h2>
          <span className="truncate text-[13px] text-muted-foreground">
            {member.shiftLabel} · {formatWon(member.hourlyWage)}
            {!active && ' · 입장 전'}
          </span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="h-10 shrink-0 rounded-full border border-line bg-white px-4 text-[15px] font-bold transition-colors hover:bg-background"
        >
          정보 수정
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="시급" value={formatWon(member.hourlyWage)} />
        <Stat label={`${monthLabel} 근무`} value={pay ? `${pay.hours}시간` : '—'} />
        <Stat label={`${monthLabel} 급여`} value={pay ? formatWon(pay.netPay) : '—'} strong />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-bold text-muted-foreground">고정 근무 요일</span>
        <div className="grid grid-cols-7 gap-1.5" aria-label="고정 근무 요일">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const on = weekdays.has(weekday)
            return (
              <span
                key={label}
                aria-label={`${label} ${on ? '근무' : '쉼'}`}
                className={cn(
                  'flex h-11 items-center justify-center rounded-[14px] text-[15px] font-bold',
                  on ? 'bg-brand text-white' : 'bg-white text-subtle',
                )}
              >
                {label}
              </span>
            )
          })}
        </div>
      </div>

      {active ? (
        <span className="text-[13px] text-muted-foreground">
          {pay ? `공제 ${formatWon(pay.deduction)}` : '공제 —'} · 지급일 매월 {store.payday}일
        </span>
      ) : (
        member.inviteCode && (
          <InviteCodeCard
            label="초대코드"
            code={member.inviteCode}
            storeName={store.name}
            name={member.name}
            storeId={member.storeId}
            invitationId={member.invitationId}
          />
        )
      )}
    </section>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-[18px] px-4 py-3.5',
        strong ? 'texture bg-brand text-white shadow-soft' : 'bg-white shadow-soft',
      )}
    >
      <span className={cn('text-xs', strong ? 'opacity-80' : 'text-muted-foreground')}>
        {label}
      </span>
      <span className="text-[19px] font-extrabold tracking-[-0.02em] tabular-nums">{value}</span>
    </div>
  )
}
