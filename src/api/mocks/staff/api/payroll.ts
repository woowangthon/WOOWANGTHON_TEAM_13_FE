import { calcPay, initialPaySettings, payMonth, storePayrolls } from '@/api/mocks/staff/payroll'
import { findStaffStore, shiftHours } from '@/api/mocks/staff/stores'
import type { PayrollEstimate, PayWorkDay, TaxType } from '@/lib/api/types'

/*
 * 가짜 서버: 급여 API (docs/07 8) — 계산은 지금처럼 규칙(payroll.ts calcPay), AI 는 설명만.
 * 급여 설정(시급 · 급여일 · 공제 · 주휴수당)은 사장님이 정한 값(가짜 데이터)을 그대로 쓴다. 알바는 바꿀 수 없다.
 */

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

const monthKey = `${payMonth.year}-${String(payMonth.month).padStart(2, '0')}`
const dateOf = (day: number) => `${monthKey}-${String(day).padStart(2, '0')}`

/** GET /stores/{storeId}/payroll/estimates/me */
export async function getMyPayrollEstimate(storeId: string): Promise<PayrollEstimate> {
  // 급여 데이터가 없는 매장(새 매장)은 근무 0 으로
  const payroll = storePayrolls[storeId] ?? {
    worked: [],
    planned: [],
    hours: 0,
    weeklyAllowanceBase: 0,
    aiNote: '',
  }
  const store = findStaffStore(storeId)
  const current = settingsOf(storeId)
  const result = calcPay(payroll, {
    wage: current.hourlyWage,
    payday: current.payday,
    tax: current.taxType,
    weeklyAllowance: current.weeklyAllowanceEnabled,
  })
  const day = (d: number, status: PayWorkDay['status']): PayWorkDay => ({
    date: dateOf(d),
    start: store.shift.start,
    end: store.shift.end,
    hours: shiftHours(store),
    status,
  })
  return {
    storeId,
    month: monthKey,
    ...current,
    workDays: [
      ...payroll.worked.map((d) => day(d, 'worked')),
      ...payroll.planned.map((d) => day(d, 'planned')),
    ].sort((a, b) => a.date.localeCompare(b.date)),
    hours: result.hours,
    basePay: result.base,
    weeklyAllowance: result.weeklyAllowance,
    grossPay: result.gross,
    deduction: result.deduction,
    netPay: result.net,
    weeks: [], // 가짜 서버는 주별 근거를 비워 둔다 (화면에서 아직 안 씀)
    aiNote: payroll.aiNote,
    isEstimate: payroll.planned.length > 0,
  }
}
