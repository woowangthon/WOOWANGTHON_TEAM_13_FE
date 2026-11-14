import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { MIN_WAGE } from '@/api/mocks/owner/data'
import { formatWon } from '@/lib/format'
import { toastApiError } from '@/lib/api/errors'
import { ApiError } from '@/lib/apiClient'
import { useMembers, useRemoveMember, useUpdateHourlyWage } from '@/pages/owner/api/members'
import type { Member } from '@/pages/owner/api/types'
import { InviteCodeCard } from '@/pages/owner/members/components/InviteCodeCard'
import { MemberBoard } from '@/pages/owner/members/components/MemberBoard'
import { MemberSummary } from '@/pages/owner/members/components/MemberSummary'
import { TaxTypeField } from '@/pages/owner/members/components/TaxTypeField'
import { WageInput } from '@/pages/owner/members/components/WageInput'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { useWide } from '@/pages/owner/useWide'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 직원 상세: 초대코드(복사 · 카톡) · 시급 · 급여 공제(4대보험 · 3.3% · 없음) · 퇴사 처리(입장한 직원은 퇴사 → 바로 차단, 기록은 남김 · 입장 전이면 코드 삭제)
// 휴대폰: 목록 위 상세 시트 / 데스크톱: 목록 오른쪽 칸에 직원 정보(MemberSummary), [정보 수정]을 누르면 같은 상세가 대화창으로
export default function MemberDetailPage() {
  const { memberId } = useParams()
  const { store } = useOwnerStore()
  const query = useMembers(store.storeId)
  const close = useCloseTo('/owner/members')
  const member = query.data?.members.find((m) => m.memberId === memberId)
  const wide = useWide()
  const [editing, setEditing] = useState(false)

  if (query.data && !member) return <Navigate to="/owner/members" replace />

  if (wide) {
    return (
      <>
        <MemberBoard
          selectedId={memberId}
          panel={
            member && (
              <MemberSummary
                key={member.memberId}
                member={member}
                onEdit={() => setEditing(true)}
              />
            )
          }
        />
        {member && editing && (
          <MemberSheet
            key={member.memberId}
            member={member}
            storeName={store.name}
            onClose={() => setEditing(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <MemberBoard />
      {member && (
        <MemberSheet key={member.memberId} member={member} storeName={store.name} onClose={close} />
      )}
    </>
  )
}

function MemberSheet({
  member,
  storeName,
  onClose,
}: {
  member: Member
  storeName: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [wage, setWage] = useState(String(member.hourlyWage))
  const [askRemove, setAskRemove] = useState(false)
  const updateWage = useUpdateHourlyWage(member.storeId)
  const remove = useRemoveMember()
  const active = member.status === 'active'

  // [저장]을 눌러야 바뀐다 (그대로 · 최저시급 미만이면 버튼이 꺼져 있다)
  const nextWage = Number(wage)
  const wageChanged = nextWage !== member.hourlyWage
  const saveWage = () => {
    const next = nextWage
    if (!wageChanged || next < MIN_WAGE) return
    updateWage.mutate(
      { memberId: member.memberId, hourlyWage: next, invited: member.status === 'invited' },
      {
        onSuccess: () => toast(`시급을 ${formatWon(next)}으로 바꿨어요`),
        onError: (error) => {
          // 입장 전은 다시 해도 같아서 원래 시급으로 되돌리고 [다시 시도] 없이 안내만
          const notJoined = error instanceof ApiError && error.code === 'MEMBER_NOT_JOINED'
          if (notJoined) setWage(String(member.hourlyWage))
          toastApiError(
            error,
            '저장하지 못했어요. 다시 시도해 주세요',
            notJoined ? undefined : saveWage,
          )
        },
      },
    )
  }

  const doRemove = () =>
    remove.mutate(member, {
      onSuccess: () => {
        toast(active ? `${member.name} 님을 퇴사 처리했어요` : '초대코드를 삭제했어요')
        navigate('/owner/members', { replace: true })
      },
      onError: (error) => toastApiError(error, '삭제하지 못했어요. 다시 시도해 주세요', doRemove),
    })

  return (
    <BottomSheet open onClose={onClose} label={member.name} closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-[19px] font-extrabold text-[#4B5535]">
            {member.name.slice(0, 1)}
          </span>
          <div className="flex flex-col gap-[3px]">
            <h2 className="m-0 text-[19px] font-extrabold">{member.name}</h2>
            <span className="text-[13px] text-muted-foreground">
              {storeName} · 시급 {formatWon(member.hourlyWage)} · {active ? '사용 중' : '입장 전'}
            </span>
          </div>
        </div>

        {member.inviteCode && (
          <InviteCodeCard
            label="초대코드"
            code={member.inviteCode}
            storeName={storeName}
            name={member.name}
            storeId={member.storeId}
            // 입장한 직원의 코드는 이미 쓰여서(410) 카톡 공유 정보를 부르지 않는다
            invitationId={active ? null : member.invitationId}
          />
        )}

        <div className="flex items-start gap-2">
          <WageInput value={wage} onChange={setWage} className="flex-1" />
          <Button
            className="h-[54px] px-5"
            disabled={!wageChanged || nextWage < MIN_WAGE || updateWage.isPending}
            onClick={saveWage}
          >
            저장
          </Button>
        </div>

        <TaxTypeField member={member} />

        {askRemove ? (
          <div className="flex flex-col gap-2.5 rounded-[18px] bg-destructive-soft p-3.5">
            <span className="text-[15px] text-destructive-foreground">
              {active
                ? '접근이 바로 차단돼요. 기록은 남아요.'
                : '이 코드로는 더 이상 입장할 수 없어요.'}
            </span>
            <Button
              variant="danger"
              size="md"
              className="h-[46px]"
              disabled={remove.isPending}
              onClick={doRemove}
            >
              {active ? '퇴사 처리' : '초대코드 삭제'}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAskRemove(true)}
            className="p-1.5 text-[15px] font-medium text-destructive-foreground"
          >
            {active ? '퇴사 처리' : '초대코드 삭제'}
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
