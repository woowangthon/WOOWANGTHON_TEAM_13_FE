import { useState } from 'react'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { WheelPicker } from '@/ui/WheelPicker'

// 근무 시간 고르기: 시간을 누르면 시트에서 시 · 분 휠을 스크롤해서 고른다 (분은 10분 단위)

const HOURS = Array.from({ length: 24 }, (_, h) => {
  const v = String(h).padStart(2, '0')
  return { value: v, label: `${v}시` }
})
const MINUTES = Array.from({ length: 6 }, (_, i) => {
  const v = String(i * 10).padStart(2, '0')
  return { value: v, label: `${v}분` }
})

export function TimeField({
  value,
  onChange,
  label,
  disabled,
}: {
  /** HH:MM */
  value: string
  onChange: (value: string) => void
  /** 예: "오픈 시작" */
  label: string
  /** 못 바꾸게 (눌러도 휠이 안 열림) */
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState(value.slice(0, 2))
  // 10분 단위가 아니면 가까운 아래 칸으로
  const [minute, setMinute] = useState(
    String(Math.floor(Number(value.slice(3, 5)) / 10) * 10).padStart(2, '0'),
  )

  const openSheet = () => {
    setHour(value.slice(0, 2))
    setMinute(String(Math.floor(Number(value.slice(3, 5)) / 10) * 10).padStart(2, '0'))
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        disabled={disabled}
        aria-label={`${label} ${value}`}
        className="h-10 rounded-xl bg-background px-3 text-[15px] font-semibold tabular-nums disabled:opacity-50"
      >
        {value}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} label={label} closeButton>
        <div className="flex flex-col gap-4">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">{label}</h2>
          <div className="grid grid-cols-2 gap-2">
            <WheelPicker options={HOURS} value={hour} onChange={setHour} label="시" />
            <WheelPicker options={MINUTES} value={minute} onChange={setMinute} label="분" />
          </div>
          <Button
            className="h-[54px]"
            onClick={() => {
              onChange(`${hour}:${minute}`)
              setOpen(false)
            }}
          >
            확인
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
