import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MIN_WAGE } from '@/api/mocks/owner/data'
import { toastApiError } from '@/lib/api/errors'
import { useCreateMember } from '@/pages/owner/api/members'
import type { Member } from '@/pages/owner/api/types'
import { InviteCodeCard } from '@/pages/owner/members/components/InviteCodeCard'
import { MemberBoard } from '@/pages/owner/members/components/MemberBoard'
import { WageInput } from '@/pages/owner/members/components/WageInput'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { Input } from '@/ui/Input'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 알바생 추가 · 코드 발급 · 카톡 공유 (docs/03 S4): 이름 · (매장) · 시급 → 초대코드 → 복사 / 카톡
export default function MemberAddPage() {
  const { store, stores } = useOwnerStore()
  const navigate = useNavigate()
  const close = useCloseTo('/owner/members')
  const [storeId, setStoreId] = useState(store.storeId)
  const [name, setName] = useState('')
  const [wage, setWage] = useState(String(MIN_WAGE))
  const [created, setCreated] = useState<Member | null>(null)
  const create = useCreateMember(storeId)
  const target = stores.find((s) => s.storeId === storeId) ?? store
  const canCreate = name.trim() && Number(wage) >= MIN_WAGE && !create.isPending

  const submit = () =>
    create.mutate(
      { name: name.trim(), hourlyWage: Number(wage) },
      {
        onSuccess: ({ member, existing }) => {
          setCreated(member)
          if (existing) toast(`${member.name} 님은 이미 만든 코드가 있어서 그 코드를 보여 드려요`)
        },
        onError: (error) =>
          toastApiError(error, '코드를 만들지 못했어요. 다시 시도해 주세요', submit),
      },
    )

  return (
    <>
      <MemberBoard />
      <BottomSheet open onClose={close} label="알바생 초대" closeButton>
        <div className="flex flex-col gap-3.5">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">알바생 초대</h2>
          {created ? (
            <div className="flex flex-col gap-3">
              <InviteCodeCard
                label={`${created.name} 님 코드`}
                code={created.inviteCode}
                storeName={target.name}
                name={created.name}
                storeId={created.storeId}
                invitationId={created.invitationId}
              />
              <Button
                className="h-[52px]"
                onClick={() => {
                  toast(`${created.name} 님을 추가했어요`)
                  navigate('/owner/members', { replace: true })
                }}
              >
                완료
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="이름"
                aria-label="이름"
                className="h-[54px] px-[18px] text-base"
              />
              {stores.length > 1 && (
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="매장">
                  {stores.map((s) => (
                    <Chip
                      key={s.storeId}
                      role="radio"
                      aria-checked={storeId === s.storeId}
                      active={storeId === s.storeId}
                      onClick={() => setStoreId(s.storeId)}
                      className={cn(
                        'border px-3.5 py-2',
                        storeId === s.storeId ? 'border-brand' : 'border-muted',
                      )}
                    >
                      {s.name}
                    </Chip>
                  ))}
                </div>
              )}
              <WageInput value={wage} onChange={setWage} />
              <Button className="h-[54px]" disabled={!canCreate} onClick={submit}>
                초대코드 만들기
              </Button>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  )
}
