import { Minus, Plus, X } from 'lucide-react'
import type { ShiftTemplateInput } from '@/pages/owner/api/types'
import { ClosedDaysField } from '@/pages/owner/store/components/ClosedDaysField'
import { TimeField } from '@/pages/owner/store/components/TimeField'
import { MAX_HEADCOUNT } from '@/pages/owner/store/shifts'

// 매장 등록 ③ 근무 타임 · 휴무: 타임마다 이름 · 시작 ~ 끝(눌러서 휠로 고르기) · 필요 인원, [+ 타임 추가] · 빼기
// 아래에 쉬는 요일(여러 개) · 공휴일에 쉬는지 체크

/** 화면에서 줄을 구분하려고 붙이는 키 (이름은 고칠 수 있어서) */
export type ShiftRow = ShiftTemplateInput & {
  key: string
  /** 이미 저장된 타임이면 아이디 (근무 탭에서 고칠 때) */
  templateId?: string
}

export function ShiftTemplateStep({
  rows,
  onRowsChange,
  closedWeekdays,
  onClosedWeekdaysChange,
  closedOnHolidays,
  onClosedOnHolidaysChange,
  error,
}: {
  rows: ShiftRow[]
  onRowsChange: (rows: ShiftRow[]) => void
  /** 쉬는 요일 · 공휴일 칸 (매장 등록에서만, 근무 탭 수정은 BE 칸이 생기면) */
  closedWeekdays?: number[]
  onClosedWeekdaysChange?: (days: number[]) => void
  closedOnHolidays?: boolean
  onClosedOnHolidaysChange?: (closed: boolean) => void
  /** 저장할 수 없는 까닭 (shiftTemplatesError) */
  error: string | null
}) {
  const setRow = (key: string, patch: Partial<ShiftRow>) =>
    onRowsChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const addRow = () =>
    onRowsChange([
      ...rows,
      { key: `row_${Date.now()}`, name: '', start: '09:00', end: '18:00', headcount: 1 },
    ])

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="flex flex-col gap-2.5">
        <span className="px-1 text-[13px] font-bold text-muted-foreground">근무 타임</span>
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-2.5 rounded-[20px] bg-card px-[18px] py-3.5 border border-line/60"
          >
            <div className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(event) => setRow(row.key, { name: event.target.value })}
                placeholder="타임 이름 (예: 주말 오후)"
                aria-label="타임 이름"
                maxLength={50}
                className="min-w-0 flex-1 border-none bg-transparent p-0 text-[16px] font-bold placeholder:text-faint"
              />
              <button
                type="button"
                aria-label={`${row.name || '타임'} 빼기`}
                disabled={rows.length <= 1}
                onClick={() => onRowsChange(rows.filter((r) => r.key !== row.key))}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-faint disabled:opacity-30"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[15px] font-medium">
                <TimeField
                  value={row.start}
                  onChange={(start) => setRow(row.key, { start })}
                  label={`${row.name || '타임'} 시작`}
                />
                ~
                <TimeField
                  value={row.end}
                  onChange={(end) => setRow(row.key, { end })}
                  label={`${row.name || '타임'} 끝`}
                />
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="인원 줄이기"
                  disabled={row.headcount <= 1}
                  onClick={() => setRow(row.key, { headcount: row.headcount - 1 })}
                  className="flex size-8 items-center justify-center rounded-full bg-background disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-9 text-center text-[15px] font-bold" aria-live="polite">
                  {row.headcount}명
                </span>
                <button
                  type="button"
                  aria-label="인원 늘리기"
                  disabled={row.headcount >= MAX_HEADCOUNT}
                  onClick={() => setRow(row.key, { headcount: row.headcount + 1 })}
                  className="flex size-8 items-center justify-center rounded-full bg-background disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </span>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="flex h-12 items-center justify-center gap-1 rounded-[20px] border-[1.5px] border-dashed border-line text-[13px] font-bold text-muted-foreground"
        >
          <Plus className="size-4" />
          타임 추가
        </button>
        {error && (
          <span role="alert" className="px-2 text-[13px] text-destructive-foreground">
            {error}
          </span>
        )}
      </section>

      {closedWeekdays && onClosedWeekdaysChange && onClosedOnHolidaysChange && (
        <section className="flex flex-col gap-2.5">
          <span className="px-1 text-[13px] font-bold text-muted-foreground">쉬는 요일</span>
          <ClosedDaysField
            closedWeekdays={closedWeekdays}
            onClosedWeekdaysChange={onClosedWeekdaysChange}
            closedOnHolidays={closedOnHolidays ?? false}
            onClosedOnHolidaysChange={onClosedOnHolidaysChange}
          />
        </section>
      )}
    </div>
  )
}
