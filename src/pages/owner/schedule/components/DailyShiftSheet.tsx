import { ChevronDown, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type { CalendarShift } from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'
import { toDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import {
  canSetDailyTime,
  useResetDailySchedule,
  useSaveDailySchedule,
  useScheduleWorkers,
  useShiftTemplates,
} from '@/pages/owner/api/fixedSchedule'
import { TimeField } from '@/pages/owner/store/components/TimeField'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'
import { WheelPicker } from '@/ui/WheelPicker'

// 하루 근무 고치기 (BE #38 PUT /schedule-calendar/{workDate}): 그날만 근무를 넣고 · 바꾸고 · 뺀다. 고정 근무표는 그대로
// 줄을 누르면 펼쳐져서 타임(누르면 그 타임 시간) · 시작 ~ 끝 시간 휠 · 사람 휠로 고친다
// 시간은 BE start · end 칸이 생기기 전까지 진짜 모드에서 잠긴다 (canSetDailyTime)
// 저장하면 그날 대기 중인 대타 요청은 BE 가 취소한다. 그날 조정한 근무가 있으면 [고정 근무로 되돌리기] (DELETE)

interface Row {
  key: string
  templateId: string
  assigneeUserId: string
  start: string
  end: string
}

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
      start: s.start,
      end: s.end,
    })),
  )
  /** 펼친 줄 (한 번에 하나) */
  const [open, setOpen] = useState<string | null>(null)
  const templates = templatesQuery.data ?? []
  const workers = workersQuery.data ?? []
  const timeEditable = canSetDailyTime()
  const adjusted = shifts.some((s) => s.manuallyAdjusted)
  const dateKey = toDateKey(date)
  const pending = save.isPending || reset.isPending

  const templateOf = (id: string) => templates.find((t) => t.templateId === id)
  const nameOf = (r: Row) =>
    templateOf(r.templateId)?.name ??
    shifts.find((s) => s.templateId === r.templateId)?.name ??
    '근무'
  const workerName = (id: string) => {
    const w = workers.find((x) => x.userId === id)
    return w ? (w.role === 'owner' ? `${w.name} (사장님)` : w.name) : '사람 고르기'
  }

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const addRow = () => {
    const t = templates[0]
    const key = `row_${Date.now()}`
    setRows((list) => [
      ...list,
      {
        key,
        templateId: t?.templateId ?? '',
        assigneeUserId: workers[0]?.userId ?? '',
        start: t?.start ?? '09:00',
        end: t?.end ?? '18:00',
      },
    ])
    setOpen(key)
  }

  const submit = () =>
    save.mutate(
      {
        date: dateKey,
        shifts: rows.map(({ templateId, assigneeUserId, start, end }) => ({
          templateId,
          assigneeUserId,
          start,
          end,
        })),
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
  const badTime = rows.some((r) => r.start === r.end)
  const ready = rows.every((r) => r.templateId && r.assigneeUserId) && !duplicated && !badTime

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
            {rows.map((r) => {
              const expanded = open === r.key
              return (
                <div key={r.key} className="flex flex-col rounded-[18px] bg-white">
                  <div className="flex items-center gap-1 py-1 pr-1 pl-4">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : r.key)}
                      aria-expanded={expanded}
                      className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                        {nameOf(r)}{' '}
                        <span className="font-semibold text-muted-foreground tabular-nums">
                          {r.start}~{r.end}
                        </span>{' '}
                        · {workerName(r.assigneeUserId)}
                      </span>
                      <ChevronDown
                        className={cn(
                          'size-4 shrink-0 text-faint transition-transform',
                          expanded && 'rotate-180',
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="이 근무 빼기"
                      onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-faint"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="flex flex-col gap-3 border-t border-[#F0EBE2] px-4 pt-3 pb-4">
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="radiogroup"
                        aria-label="근무 타임"
                      >
                        {templates.map((t) => (
                          <button
                            key={t.templateId}
                            type="button"
                            role="radio"
                            aria-checked={r.templateId === t.templateId}
                            onClick={() =>
                              setRow(r.key, {
                                templateId: t.templateId,
                                start: t.start,
                                end: t.end,
                              })
                            }
                            className={cn(
                              'h-9 rounded-full px-3 text-[13px] font-bold',
                              r.templateId === t.templateId
                                ? 'bg-brand text-white'
                                : 'bg-background text-foreground',
                            )}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-[15px] font-semibold">
                        <TimeField
                          value={r.start}
                          onChange={(start) => setRow(r.key, { start })}
                          label={`${nameOf(r)} 시작`}
                          disabled={!timeEditable}
                        />
                        ~
                        <TimeField
                          value={r.end}
                          onChange={(end) => setRow(r.key, { end })}
                          label={`${nameOf(r)} 끝`}
                          disabled={!timeEditable}
                        />
                      </div>
                      {!timeEditable && (
                        <span className="text-xs text-muted-foreground">
                          시간 바꾸기는 곧 돼요. 지금은 타임 시간으로 저장해요
                        </span>
                      )}
                      <WheelPicker
                        label="담당자"
                        options={workers.map((w) => ({
                          value: w.userId,
                          label: w.role === 'owner' ? `${w.name} (사장님)` : w.name,
                        }))}
                        value={r.assigneeUserId}
                        onChange={(assigneeUserId) => setRow(r.key, { assigneeUserId })}
                        className="bg-background"
                      />
                    </div>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              onClick={addRow}
              disabled={templates.length === 0}
              className="flex h-11 items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-dashed border-line text-[13px] font-bold text-[#6B7068] disabled:opacity-40"
            >
              <Plus className="size-4" />
              근무 추가
            </button>
            {(duplicated || badTime) && (
              <span role="alert" className="px-1 text-[13px] text-destructive-foreground">
                {duplicated
                  ? '같은 타임에 같은 사람이 두 번 들어 있어요'
                  : '시작과 끝 시간을 다르게 정해 주세요'}
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
