import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type { ScheduleWorker } from '@/lib/api/types'
import {
  useFixedSchedule,
  useSavePersonShifts,
  useScheduleWorkers,
  useShiftTemplates,
} from '@/pages/owner/api/fixedSchedule'
import { useMembers } from '@/pages/owner/api/members'
import type { FixedAssignment, ShiftTemplate } from '@/pages/owner/api/types'
import { avatarColors } from '@/pages/owner/components/avatarColors'
import { WeekShiftGrid } from '@/pages/owner/components/WeekShiftGrid'
import { cellKey, WEEKDAY_LABELS } from '@/pages/owner/store/shifts'
import { LoadError } from '@/shared/LoadError'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 고정 근무표: 사람마다 매주 근무(타임별 요일) + [고치기] → 요일 × 타임 칸 (같은 날 여러 타임 가능)
// 코드로 입장하기 전 직원은 아직 고를 수 없어서 안내만 (BE 에 초대 때 근무 저장 요청 중)

/** "오픈 월 · 화 · 수 / 마감 금" */
function summary(mine: FixedAssignment[], templates: ShiftTemplate[]) {
  const parts = templates.flatMap((t) => {
    const days = mine
      .filter((a) => a.template.templateId === t.templateId)
      .map((a) => a.weekday)
      .sort()
    return days.length ? [`${t.name} ${days.map((d) => WEEKDAY_LABELS[d]).join(' · ')}`] : []
  })
  return parts.join(' / ')
}

export function FixedScheduleCard({ storeId }: { storeId: string }) {
  const workersQuery = useScheduleWorkers(storeId)
  const fixedQuery = useFixedSchedule(storeId)
  const templatesQuery = useShiftTemplates(storeId)
  const membersQuery = useMembers(storeId)
  const [editing, setEditing] = useState<ScheduleWorker | null>(null)

  const query = [workersQuery, fixedQuery, templatesQuery].find((q) => q.error)
  const loading = workersQuery.isPending || fixedQuery.isPending || templatesQuery.isPending
  const workers = workersQuery.data ?? []
  const all = fixedQuery.data ?? []
  const templates = templatesQuery.data ?? []
  const invited = (membersQuery.data?.members ?? []).filter((m) => m.status === 'invited')

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
            const mine = all.filter((a) => a.assignee.userId === w.userId)
            const [bg, fg] = w.role === 'owner' ? ['var(--brand)', '#fff'] : avatarColors(i)
            return (
              <div
                key={w.userId}
                className="flex items-center gap-3 border-b border-[#F0EBE2] py-3 last:border-b-0"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: bg, color: fg }}
                >
                  {w.name.slice(0, 1)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">
                    {w.role === 'owner' ? `${w.name} (사장님)` : w.name}
                  </span>
                  <span className="text-[13px] break-keep text-muted-foreground">
                    {mine.length ? summary(mine, templates) : '정해진 근무가 없어요'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(w)}
                  aria-label={`${w.name} 근무 고치기`}
                  disabled={templates.length === 0}
                  className="shrink-0 p-0 text-[13px] font-bold text-brand disabled:text-faint"
                >
                  고치기
                </button>
              </div>
            )
          })}
        </div>
      )}
      {invited.length > 0 && (
        <span className="px-2 text-xs text-muted-foreground">
          {invited.map((m) => m.name).join(' · ')} 님은 초대코드로 입장하면 근무를 정할 수 있어요
        </span>
      )}
      {editing && (
        <EditSheet
          storeId={storeId}
          worker={editing}
          all={all}
          templates={templates}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function EditSheet({
  storeId,
  worker,
  all,
  templates,
  onClose,
}: {
  storeId: string
  worker: ScheduleWorker
  all: FixedAssignment[]
  templates: ShiftTemplate[]
  onClose: () => void
}) {
  const [cells, setCells] = useState(
    () =>
      new Set(
        all
          .filter((a) => a.assignee.userId === worker.userId)
          .map((a) => cellKey(a.template.templateId, a.weekday)),
      ),
  )
  const save = useSavePersonShifts(storeId)

  const submit = () => {
    const shifts = templates.flatMap((t) =>
      WEEKDAY_LABELS.flatMap((_, weekday) =>
        cells.has(cellKey(t.templateId, weekday)) ? [{ templateId: t.templateId, weekday }] : [],
      ),
    )
    save.mutate(
      { userId: worker.userId, all, shifts },
      {
        onSuccess: () => {
          toast('저장했어요. 근무 달력에 반영돼요')
          onClose()
        },
        onError: (error) => toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', submit),
      },
    )
  }

  return (
    <BottomSheet open onClose={onClose} label={`${worker.name} 고정 근무`} closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">
            {worker.name} 고정 근무
          </h2>
          <span className="text-[13px] text-muted-foreground">
            매주 일하는 요일 · 타임을 눌러 주세요. 같은 날 여러 타임도 돼요
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
        />
        <Button className="h-[54px]" disabled={save.isPending} onClick={submit}>
          저장
        </Button>
      </div>
    </BottomSheet>
  )
}
