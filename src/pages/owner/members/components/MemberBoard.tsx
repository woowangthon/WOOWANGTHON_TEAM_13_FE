import { UserPlus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatWon } from '@/lib/format'
import { useMembers } from '@/pages/owner/api/members'
import type { Member } from '@/pages/owner/api/types'
import { PersonAvatar } from '@/pages/owner/components/PersonAvatar'
import { InviteForm } from '@/pages/owner/members/components/InviteForm'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 직원 탭: 직원 N명 · [초대] · 직원 목록 (사용 중 / 초대됨)
// 데스크톱(panel 이 있을 때): 왼쪽 목록 한 줄 · 오른쪽 칸(panel) — 기본은 초대 폼, 직원을 고르면 그 직원 정보 (selectedId 진한 테두리)
export function MemberBoard({ panel, selectedId }: { panel?: ReactNode; selectedId?: string }) {
  const { store } = useOwnerStore()
  const navigate = useNavigate()
  const query = useMembers(store.storeId)
  const members = query.data?.members ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2.5 px-1 lg:mb-1">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">{store.name}</span>
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">
            직원 {query.data ? members.length : ''}명
          </h1>
        </div>
        <Button
          variant="ink"
          size="sm"
          className="h-10 pr-3.5 pl-2.5"
          onClick={() => navigate('/owner/members/new')}
        >
          <UserPlus className="size-[18px]" />
          초대
        </Button>
      </div>

      <div
        className={cn(
          'flex flex-col gap-4',
          panel && 'lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-6',
        )}
      >
        {query.isPending ? (
          <Spinner />
        ) : query.error ? (
          <LoadError error={query.error} onRetry={() => query.refetch()} />
        ) : members.length === 0 ? (
          <EmptyGuide
            message="아직 직원이 없어요"
            hint="알바생을 초대하면 코드가 생겨요. 카톡으로 보낼 수 있어요"
            action={
              <Button
                size="md"
                className="h-[46px] px-5"
                onClick={() => navigate('/owner/members/new')}
              >
                <UserPlus />
                알바생 초대
              </Button>
            }
          />
        ) : (
          <ul
            className={cn(
              'm-0 flex list-none flex-col gap-2.5 p-0',
              !panel && 'lg:grid lg:grid-cols-2 lg:gap-3',
            )}
          >
            {members.map((member, i) => {
              const active = member.status === 'active'
              const selected = member.memberId === selectedId
              return (
                <li key={member.memberId}>
                  <Link
                    to={`/owner/members/${member.memberId}`}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3.5 rounded-[22px] bg-card px-4 py-3.5 text-foreground shadow-soft transition-shadow',
                      // 데스크톱에서 고른 직원은 흰 바탕 + 2px 매장 색 테두리(ring — 카드 그림자와 따로) (휴대폰은 시트가 떠서 표시 없음)
                      selected && 'lg:bg-white lg:ring-2 lg:ring-brand lg:ring-inset',
                    )}
                  >
                    <PersonAvatar
                      name={member.name}
                      index={i}
                      size={panel ? 46 : 48}
                      dot={active ? '#6FA97B' : '#D9B26A'}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="text-base font-bold">{member.name}</span>
                      <span className="truncate text-[13px] text-muted-foreground">
                        {member.shiftLabel} · {formatWon(member.hourlyWage)}
                      </span>
                    </span>
                    <Badge
                      size="md"
                      variant={active ? 'soft' : 'warm'}
                      className={active ? '' : 'bg-[#FBF1E4] text-[#A86A26]'}
                    >
                      {active ? '사용 중' : '초대됨'}
                    </Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {/* 오른쪽 칸 (데스크톱만) — 스크롤해도 따라온다 */}
        {panel && <div className="hidden lg:sticky lg:top-7 lg:block">{panel}</div>}
      </div>
    </div>
  )
}

/** 데스크톱 오른쪽 칸의 초대 폼 — [완료] 하면 폼을 비워 다음 사람을 바로 초대할 수 있다 */
export function InvitePanel({ onDone }: { onDone?: (member: Member) => void }) {
  const [round, setRound] = useState(0)
  return (
    <section className="flex flex-col gap-4 rounded-[28px] bg-card p-6 shadow-soft">
      <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">알바생 초대</h2>
      <InviteForm
        key={round}
        onDone={(member) => {
          setRound((r) => r + 1)
          onDone?.(member)
        }}
      />
    </section>
  )
}
