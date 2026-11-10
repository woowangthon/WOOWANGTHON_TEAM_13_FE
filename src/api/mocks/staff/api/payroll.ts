import { getScheduleCalendar } from '@/api/mocks/staff/api/schedule'
import { initialPaySettings, round10, TAX_RATE } from '@/api/mocks/staff/payroll'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { toDateKey } from '@/lib/date'
import type { PayrollEstimate, PayWeek, PayWorkDay, TaxType } from '@/lib/api/types'

/*
 * 가짜 서버: 급여 API (docs/07 8) — BE #31 처럼 고정 근무표(가짜 공유 근무 달력)에서 '내 근무'만 골라 계산한다.
 * 그래서 근무표 탭과 예상 급여 달력의 근무가 항상 같다 (대타로 바뀐 날 포함).
 * 매장 시연 날짜(달빛 카페 11/20)보다 앞이면 worked(일한 날), 같거나 뒤면 planned(예정).
 * 급여 설정(시급 · 급여일 · 공제 · 주휴수당)은 사장님이 정한 값(가짜 데이터)을 그대로 쓴다. 알바는 바꿀 수 없다.
 */

/** 가짜 근무표에서 '나'를 고르는 표시 (getScheduleCalendar 가 '나'를 이 값으로 돌려준다) */
const ME = 'me'
const WEEKLY_ALLOWANCE_HOURS = 15

function settingsOf(storeId: string): {
  hourlyWage: number
  payday: number
  taxType: TaxType
  weeklyAllowanceEnabled: boolean
} {
  const { wage, payday, tax, weeklyAllowance } =
    initialPaySettings[storeId] ?? initialPaySettings.dalbit
  return { hourlyWage: wage, payday, taxType: tax, weeklyAllowanceEnabled: weeklyAllowance }
}

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** GET /stores/{storeId}/payroll/estimates/me?month=2026-11 (month 를 빼면 매장 시연 날짜의 달) */
export async function getMyPayrollEstimate(
  storeId: string,
  month?: string,
): Promise<PayrollEstimate> {
  const store = findStaffStore(storeId)
  const todayKey = toDateKey(store.today)
  const monthKey = month ?? todayKey.slice(0, 7)
  const [year, monthNumber] = monthKey.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const calendar = await getScheduleCalendar(
    storeId,
    `${monthKey}-01`,
    `${monthKey}-${String(lastDay).padStart(2, '0')}`,
    ME,
  )
  const workDays: PayWorkDay[] = calendar.shifts
    .filter((shift) => shift.assignee.userId === ME)
    .map((shift) => ({
      date: shift.date,
      start: shift.start,
      end: shift.end,
      hours: Math.round(((minutes(shift.end) - minutes(shift.start)) / 60) * 100) / 100,
      status: shift.date < todayKey ? 'worked' : 'planned',
    }))

  const settings = settingsOf(storeId)
  // 주(월요일 시작)별 시간 → 주 15시간 이상인 주만 주휴수당 (주 시간 / 40 × 8 × 시급)
  const weekMap = new Map<string, number>()
  for (const day of workDays) {
    const date = new Date(day.date)
    const monday = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() - ((date.getDay() + 6) % 7),
    )
    const key = toDateKey(monday)
    weekMap.set(key, (weekMap.get(key) ?? 0) + day.hours)
  }
  const weeks: PayWeek[] = [...weekMap].map(([weekStart, hours]) => {
    const eligible = settings.weeklyAllowanceEnabled && hours >= WEEKLY_ALLOWANCE_HOURS
    return {
      weekStart,
      hours,
      weeklyAllowanceEligible: eligible,
      weeklyAllowance: eligible ? round10((hours / 5) * settings.hourlyWage) : 0,
    }
  })
  const hours = Math.round(workDays.reduce((sum, d) => sum + d.hours, 0) * 100) / 100
  const basePay = Math.round(hours * settings.hourlyWage)
  const weeklyAllowance = weeks.reduce((sum, w) => sum + w.weeklyAllowance, 0)
  const grossPay = basePay + weeklyAllowance
  const deduction = round10(grossPay * TAX_RATE[settings.taxType])
  return {
    storeId,
    month: monthKey,
    ...settings,
    workDays,
    hours,
    basePay,
    weeklyAllowance,
    grossPay,
    deduction,
    netPay: grossPay - deduction,
    weeks,
    aiNote: null,
    isEstimate: true,
  }
}
