import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type { ScheduleWorker } from '@/lib/api/types'
import {
  useFixedSchedule,
  useSavePersonShifts,
  useScheduleWorkers,
  useShiftTemplates,
} from '@/pages/owner/api/fixedSchedule'
import { useMembers, useUpdateInviteSchedule } from '@/pages/owner/api/members'
import type { Member, ShiftTemplate, WeekShift } from '@/pages/owner/api/types'
import { avatarColors } from '@/pages/owner/components/avatarColors'
import { WeekShiftGrid } from '@/pages/owner/components/WeekShiftGrid'
import { cellKey, WEEKDAY_LABELS } from '@/pages/owner/store/shifts'
import { LoadError } from '@/shared/LoadError'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 고정 근무표: 사람마다 매주 근무(타임별 요일) + [고치기] → 요일 × 타임 칸 (같은 날 여러 타임 가능)
// 코드로 입장하기 전 직원도 초대에 근무를 정해 두고 고칠 수 있다 (BE #38 PATCH /invitations/{id}, 입장하면 고정 스케줄로) · 쉬는 요일은 막힘

/** "오픈 월 · 화 · 수 / 마감 금" */
function summary(mine: WeekShift[], templates: ShiftTemplate[]) {
  const parts = templates.flatMap((t) => {
    const days = mine
      .filter((a) => a.templateId === t.templateId)
      .map((a) => a.weekday)
      .sort()
    return days.length ? [`${t.name} ${days.map((d) => WEEKDAY_LABELS[d]).join(' · ')}`] : []
  })
  return parts.join(' / ')
}

/** [고치기] 대상: 입장한 사람(사장님 · 직원)이나 입장 전 직원(초대) */
type EditTarget =
  | { kind: 'worker'; name: string; worker: ScheduleWorker; shifts: WeekShift[] }
  | { kind: 'invited'; name: string; member: Member; shifts: WeekShift[] }

export function FixedScheduleCard({
  storeId,
  closedWeekdays,
}: {
  storeId: string
  /** 매장 쉬는 요일 (0=월) — 고를 수 없게 막는다 */
  closedWeekdays: number[]
}) {
  const workersQuery = useScheduleWorkers(storeId)
  const fixedQuery = useFixedSchedule(storeId)
  const templatesQuery = useShiftTemplates(storeId)
  const membersQuery = useMembers(storeId)
  const savePerson = useSavePersonShifts(storeId)
  const saveInvite = useUpdateInviteSchedule(storeId)
  const [editing, setEditing] = useState<EditTarget | null>(null)

  const query = [workersQuery, fixedQuery, templatesQuery].find((q) => q.error)
  const loading = workersQuery.isPending || fixedQuery.isPending || templatesQuery.isPending
  const workers = workersQuery.data ?? []
  const all = fixedQuery.data ?? []
  const templates = templatesQuery.data ?? []
  const invited = (membersQuery.data?.members ?? []).filter((m) => m.status === 'invited')
  const shiftsOf = (userId: string): WeekShift[] =>
    all
      .filter((a) => a.assignee.userId === userId)
      .map((a) => ({ templateId: a.template.templateId, weekday: a.weekday }))

  const save = (target: EditTarget, shifts: WeekShift[], done: () => void) => {
    const options = {
      onSuccess: () => {
        toast(
          target.kind === 'worker'
            ? '저장했어요. 근무 달력에 반영돼요'
            : '저장했어요. 입장하면 이 근무로 시작해요',
        )
        done()
      },
      onError: (error: unknown) =>
        toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () =>
          save(target, shifts, done),
        ),
    }
    if (target.kind === 'worker') {
      savePerson.mutate({ userId: target.worker.userId, all, shifts }, options)
    } else saveInvite.mutate({ member: target.member, schedule: shifts }, options)
  }

  const row = (
    key: string,
    name: string,
    label: string,
    color: [string, string],
    shifts: WeekShift[],
    onEdit: () => void,
  ) => (
    <div
      key={key}
      className="flex items-center gap-3 border-b border-[#F0EBE2] py-3 last:border-b-0"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ background: color[0], color: color[1] }}
      >
        {name.slice(0, 1)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{label}</span>
        <span className="text-[13px] break-keep text-muted-foreground">
          {shifts.length ? summary(shifts, templates) : '정해진 근무가 없어요'}
        </span>
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${name} 근무 고치기`}
        disabled={templates.length === 0}
        className="shrink-0 p-0 text-[13px] font-bold text-brand disabled:text-faint"
      >
        고치기
      </button>
    </div>
  )

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 px-1 text-[15px] font-extrabold">고정 근무표</h2>
      {loading ? (
        <Spinner />
      ) : query?.error ? (
        <LoadError error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="flex flex-col rounded-[22px] bg-card px-[18px] py-1 shadow-soft">
          {workers.map((w, i) => {
            const shifts = shiftsOf(w.userId)
            return row(
              w.userId,
              w.name,
              w.role === 'owner' ? `${w.name} (사장님)` : w.name,
              w.role === 'owner' ? ['var(--brand)', '#fff'] : avatarColors(i),
              shifts,
              () => setEditing({ kind: 'worker', name: w.name, worker: w, shifts }),
            )
          })}
          {/* 입장 전 직원: 초대에 정해 둔 근무 (입장하면 BE 가 고정 스케줄로 옮긴다) */}
          {invited.map((m) => {
            const shifts = m.schedule ?? []
            return row(
              m.memberId,
              m.name,
              `${m.name} (입장 전)`,
              ['#EFEBE4', '#8A8F86'],
              shifts,
              () => setEditing({ kind: 'invited', name: m.name, member: m, shifts }),
            )
          })}
        </div>
      )}
      {editing && (
        <EditSheet
          target={editing}
          templates={templates}
          closedWeekdays={closedWeekdays}
          pending={savePerson.isPending || saveInvite.isPending}
          onSave={(shifts) => save(editing, shifts, () => setEditing(null))}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function EditSheet({
  target,
  templates,
  closedWeekdays,
  pending,
  onSave,
  onClose,
}: {
  target: EditTarget
  templates: ShiftTemplate[]
  closedWeekdays: number[]
  pending: boolean
  onSave: (shifts: WeekShift[]) => void
  onClose: () => void
}) {
  const [cells, setCells] = useState(
    () => new Set(target.shifts.map((s) => cellKey(s.templateId, s.weekday))),
  )

  // 쉬는 요일 칸은 고를 수 없고, 예전에 넣어 둔 칸도 저장할 때 뺀다
  const submit = () =>
    onSave(
      templates.flatMap((t) =>
        WEEKDAY_LABELS.flatMap((_, weekday) =>
          cells.has(cellKey(t.templateId, weekday)) && !closedWeekdays.includes(weekday)
            ? [{ templateId: t.templateId, weekday }]
            : [],
        ),
      ),
    )

  return (
    <BottomSheet open onClose={onClose} label={`${target.name} 고정 근무`} closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">
            {target.name} 고정 근무
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {target.kind === 'invited'
              ? '초대코드로 입장하면 이 근무로 시작해요. 같은 날 여러 타임도 돼요'
              : '매주 일하는 요일 · 타임을 눌러 주세요. 같은 날 여러 타임도 돼요'}
          </span>
        </div>
        <WeekShiftGrid
          rows={templates.map((t) => ({
            key: t.templateId,
            label: t.name,
            sub: `${t.start}~${t.end}`,
          }))}
          value={cells}
          onChange={setCells}
          closedWeekdays={closedWeekdays}
        />
        <Button className="h-[54px]" disabled={pending} onClick={submit}>
          저장
        </Button>
      </div>
    </BottomSheet>
  )
}
