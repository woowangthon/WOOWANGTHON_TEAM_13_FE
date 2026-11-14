import { useState } from 'react'
import { MIN_WAGE } from '@/api/mocks/owner/data'
import { toastApiError } from '@/lib/api/errors'
import { useShiftTemplates } from '@/pages/owner/api/fixedSchedule'
import { canSaveInviteSchedule, useCreateMember, useMembers } from '@/pages/owner/api/members'
import type { Member } from '@/pages/owner/api/types'
import { WeekShiftGrid } from '@/pages/owner/components/WeekShiftGrid'
import { InviteCodeCard } from '@/pages/owner/members/components/InviteCodeCard'
import { WageInput } from '@/pages/owner/members/components/WageInput'
import { cellKey, WEEKDAY_LABELS } from '@/pages/owner/store/shifts'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { Input } from '@/ui/Input'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 알바생 초대 폼 (docs/03 S4): 이름 · (매장) · 시급 · 고정 근무(선택, 요일 × 타임) → 초대코드 → 복사 / 카톡 → [완료]
// 휴대폰은 초대 시트(MemberAddPage) 안, 데스크톱은 직원 탭 오른쪽 칸에 그대로 쓴다
// 고정 근무는 BE 초대에 칸이 생기기 전까지 진짜 모드에서는 안내만 (입장하면 근무 탭에서 정한다)
// 같은 매장에 같은 이름(띄어쓰기 · 대소문자 무시) 직원 · 초대가 있으면 만들지 않는다 — 근무 · 급여에서 구별이 안 돼서 (QA 11/15)
export function InviteForm({ onDone }: { onDone: (member: Member) => void }) {
  const { store, stores } = useOwnerStore()
  const [storeId, setStoreId] = useState(store.storeId)
  const [name, setName] = useState('')
  const [wage, setWage] = useState(String(MIN_WAGE))
  const [created, setCreated] = useState<Member | null>(null)
  /** 고정 근무 칸: cellKey(templateId, 요일) */
  const [cells, setCells] = useState<Set<string>>(new Set())
  const withSchedule = canSaveInviteSchedule()
  const templates = useShiftTemplates(storeId)
  const create = useCreateMember(storeId)
  const members = useMembers(storeId)
  const target = stores.find((s) => s.storeId === storeId) ?? store
  const sameName = members.data?.members.find((m) => nameKey(m.name) === nameKey(name))
  const canCreate = name.trim() && !sameName && Number(wage) >= MIN_WAGE && !create.isPending

  const submit = () =>
    create.mutate(
      {
        name: name.trim(),
        hourlyWage: Number(wage),
        schedule: withSchedule
          ? (templates.data ?? []).flatMap((t) =>
              WEEKDAY_LABELS.flatMap((_, weekday) =>
                cells.has(cellKey(t.templateId, weekday))
                  ? [{ templateId: t.templateId, weekday }]
                  : [],
              ),
            )
          : undefined,
      },
      {
        onSuccess: ({ member, existing }) => {
          setCreated(member)
          if (existing) toast(`${member.name} 님은 이미 만든 코드가 있어서 그 코드를 보여 드려요`)
        },
        onError: (error) =>
          toastApiError(error, '코드를 만들지 못했어요. 다시 시도해 주세요', submit),
      },
    )

  if (created) {
    return (
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
            onDone(created)
          }}
        >
          완료
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="이름"
        aria-label="이름"
        className="h-[54px] px-[18px] text-base"
      />
      {sameName && (
        <span role="alert" className="-mt-1 px-1 text-[13px] text-destructive-foreground">
          {sameName.status === 'invited'
            ? `${sameName.name} 님은 이미 초대했어요. 직원 목록에서 코드를 다시 볼 수 있어요`
            : '같은 이름의 직원이 있어요. 성이나 별명을 붙여 주세요 (예: 김지은, 지은B)'}
        </span>
      )}
      {stores.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="매장">
          {stores.map((s) => (
            <Chip
              key={s.storeId}
              role="radio"
              aria-checked={storeId === s.storeId}
              active={storeId === s.storeId}
              onClick={() => {
                setStoreId(s.storeId)
                // 매장마다 근무 타임이 달라서 고른 칸을 비운다
                setCells(new Set())
              }}
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
      <div className="flex flex-col gap-2">
        <span className="px-1 text-[13px] font-bold text-muted-foreground">고정 근무 (선택)</span>
        {!withSchedule ? (
          <span className="rounded-[18px] bg-white px-4 py-3 text-[13px] text-muted-foreground">
            직원이 초대코드로 입장하면 근무 탭에서 요일 · 타임을 정할 수 있어요
          </span>
        ) : (templates.data ?? []).length === 0 ? (
          <span className="rounded-[18px] bg-white px-4 py-3 text-[13px] text-muted-foreground">
            {templates.isPending
              ? '근무 타임을 불러오는 중이에요'
              : '근무 타임이 아직 없어요. 근무 탭에서 먼저 만들어 주세요'}
          </span>
        ) : (
          // 데스크톱 오른쪽 칸은 넓어서 칸이 너무 커지지 않게 480px 까지
          <div className="max-w-[480px]">
            <WeekShiftGrid
              rows={(templates.data ?? []).map((t) => ({
                key: t.templateId,
                label: t.name,
                sub: `${t.start}~${t.end}`,
              }))}
              value={cells}
              onChange={setCells}
              closedWeekdays={target.closedWeekdays}
            />
          </div>
        )}
      </div>
      <Button className="h-[54px]" disabled={!canCreate} onClick={submit}>
        초대코드 만들기
      </Button>
    </div>
  )
}

/** 이름 비교용: 띄어쓰기 · 대소문자 무시 */
const nameKey = (name: string) => name.replace(/\s+/g, '').toLowerCase()
