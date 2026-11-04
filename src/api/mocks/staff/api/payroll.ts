import { calcPay, initialPaySettings, payMonth, storePayrolls } from '@/api/mocks/staff/payroll'
import { findStaffStore, shiftHours } from '@/api/mocks/staff/stores'
import type { PayrollEstimate, PaySettingsInput, PayWorkDay } from '@/lib/api/types'

/*
 * 가짜 서버: 급여 API (docs/07 8) — 계산은 지금처럼 규칙(payroll.ts calcPay), AI 는 설명만.
 * 급여 설정(시급 · 급여일 · 공제 · 주휴수당)은 서버가 기억한다고 보고 메모리에 둔다.
 */

const settings = new Map<string, PaySettingsInput>() // storeId → 급여 설정

function settingsOf(storeId: string): PaySettingsInput {
  const saved = settings.get(storeId)
  if (saved) return saved
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

/** 임시: 알바 화면 급여 설정 저장 — 실제 API 없음 (BE 답 전까지, docs/07 질문 4) */
export async function saveMyPaySettings(storeId: string, input: PaySettingsInput) {
  settings.set(storeId, input)
}
