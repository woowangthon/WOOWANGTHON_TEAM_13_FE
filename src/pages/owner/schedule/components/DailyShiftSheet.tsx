import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type { CalendarShift } from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'
import { toDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import {
  useResetDailySchedule,
  useSaveDailySchedule,
  useScheduleWorkers,
  useShiftTemplates,
} from '@/pages/owner/api/fixedSchedule'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 하루 근무 고치기 (BE #38 PUT /schedule-calendar/{workDate}): 그날만 근무를 넣고 · 담당자를 바꾸고 · 뺀다
// 고정 근무표는 그대로. 저장하면 그날 대기 중인 대타 요청은 BE 가 취소한다
// 그날 조정한 근무가 있으면 [고정 근무로 되돌리기] (DELETE)

interface Row {
  key: string
  templateId: string
  assigneeUserId: string
}

const SELECT =
  'h-10 min-w-0 flex-1 rounded-xl border-none bg-background px-2.5 text-sm font-semibold text-foreground'

export function DailyShiftSheet({
  storeId,
  date,
  shifts,
  onClose,
}: {
  storeId: string
  date: Date
  /** 그날 지금 보이는 근무 (고정 근무 · 대타 · 조정 반영) */
  shifts: CalendarShift[]
  onClose: () => void
}) {
  const templatesQuery = useShiftTemplates(storeId)
  const workersQuery = useScheduleWorkers(storeId)
  const save = useSaveDailySchedule(storeId)
  const reset = useResetDailySchedule(storeId)
  const [rows, setRows] = useState<Row[]>(() =>
    shifts.map((s, i) => ({
      key: `row_${i}`,
      templateId: s.templateId,
      assigneeUserId: s.assignee.userId,
    })),
  )
  const templates = templatesQuery.data ?? []
  const workers = workersQuery.data ?? []
  const adjusted = shifts.some((s) => s.manuallyAdjusted)
  const dateKey = toDateKey(date)
  const pending = save.isPending || reset.isPending

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const addRow = () =>
    setRows((list) => [
      ...list,
      {
        key: `row_${Date.now()}`,
        templateId: templates[0]?.templateId ?? '',
        assigneeUserId: workers[0]?.userId ?? '',
      },
    ])

  const submit = () =>
    save.mutate(
      {
        date: dateKey,
        shifts: rows.map((r) => ({ templateId: r.templateId, assigneeUserId: r.assigneeUserId })),
      },
      {
        onSuccess: () => {
          toast('이날 근무를 바꿨어요')
          onClose()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'DAILY_SCHEDULE_TIME_CONFLICT') {
            return toast.error('같은 사람의 근무 시간이 겹쳐요')
          }
          toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', submit)
        },
      },
    )

  const restore = () =>
    reset.mutate(dateKey, {
      onSuccess: () => {
        toast('고정 근무로 되돌렸어요')
        onClose()
      },
      onError: (error) => toastApiError(error, '되돌리지 못했어요. 다시 시도해 주세요', restore),
    })

  // 같은 타임 · 같은 사람을 두 번 넣으면 BE 가 받지 않는다
  const duplicated =
    new Set(rows.map((r) => `${r.templateId}|${r.assigneeUserId}`)).size !== rows.length
  const ready = rows.every((r) => r.templateId && r.assigneeUserId) && !duplicated

  return (
    <BottomSheet open onClose={onClose} label={`${formatDate(date)} 근무 고치기`} closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">
            {formatDate(date)} 근무
          </h2>
          <span className="text-[13px] text-muted-foreground">
            이날만 바뀌어요. 고정 근무표는 그대로예요
          </span>
        </div>

        {templatesQuery.isPending || workersQuery.isPending ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-2">
            {rows.length === 0 && (
              <span className="rounded-[18px] bg-white px-4 py-3.5 text-sm text-muted-foreground">
                이날 근무가 없어요. [근무 추가]로 넣을 수 있어요
              </span>
            )}
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-2 rounded-[18px] bg-white p-2">
                <select
                  value={r.templateId}
                  onChange={(event) => setRow(r.key, { templateId: event.target.value })}
                  aria-label="근무 타임"
                  className={SELECT}
                >
                  {!templates.some((t) => t.templateId === r.templateId) && (
                    <option value={r.templateId}>
                      {shifts.find((s) => s.templateId === r.templateId)?.name ?? '타임 고르기'}
                    </option>
                  )}
                  {templates.map((t) => (
                    <option key={t.templateId} value={t.templateId}>
                      {t.name} {t.start}~{t.end}
                    </option>
                  ))}
                </select>
                <select
                  value={r.assigneeUserId}
                  onChange={(event) => setRow(r.key, { assigneeUserId: event.target.value })}
                  aria-label="담당자"
                  className={SELECT}
                >
                  {workers.map((w) => (
                    <option key={w.userId} value={w.userId}>
                      {w.role === 'owner' ? `${w.name} (사장님)` : w.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="이 근무 빼기"
                  onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-faint"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              disabled={templates.length === 0}
              className="flex h-11 items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-dashed border-line text-[13px] font-bold text-[#6B7068] disabled:opacity-40"
            >
              <Plus className="size-4" />
              근무 추가
            </button>
            {duplicated && (
              <span role="alert" className="px-1 text-[13px] text-destructive-foreground">
                같은 타임에 같은 사람이 두 번 들어 있어요
              </span>
            )}
          </div>
        )}

        <Button className="h-[54px]" disabled={!ready || pending} onClick={submit}>
          저장
        </Button>
        {adjusted && (
          <Button variant="soft" disabled={pending} onClick={restore}>
            고정 근무로 되돌리기
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
