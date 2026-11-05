import { UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { formatWon } from '@/lib/format'
import { useMembers } from '@/pages/owner/api/members'
import { PersonAvatar } from '@/pages/owner/components/PersonAvatar'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'

// 직원 탭: 직원 N명 · [초대] · 직원 목록 (사용 중 / 초대됨)
export function MemberBoard() {
  const { store } = useOwnerStore()
  const navigate = useNavigate()
  const query = useMembers(store.storeId)
  const members = query.data?.members ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2.5 px-1">
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
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {members.map((member, i) => {
            const active = member.status === 'active'
            return (
              <li key={member.memberId}>
                <Link
                  to={`/owner/members/${member.memberId}`}
                  className="flex items-center gap-3.5 rounded-[22px] bg-card px-4 py-3.5 text-foreground shadow-soft"
                >
                  <PersonAvatar
                    name={member.name}
                    index={i}
                    size={48}
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
    </div>
  )
}
