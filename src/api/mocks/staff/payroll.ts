// 가짜 데이터: 예상 급여 — BE 연결 전까지 사용. 계산은 규칙(코드)으로 하고 AI 는 설명만 한다.

export const MIN_WAGE = 10320

export type TaxType = 'none' | '3.3' | 'ins'

export interface PaySettings {
  /** 시급 (숫자만) */
  wage: number
  /** 급여일 1~28, 31 = 말일 */
  payday: number
  tax: TaxType
  /** 주휴수당 자동 계산 */
  weeklyAllowance: boolean
}

export interface StorePayroll {
  /** 11월 근무한 날 */
  worked: number[]
  /** 11월 근무 예정인 날 */
  planned: number[]
  /** 이번 달 근무 시간 */
  hours: number
  /** 최저시급 기준 주휴수당 */
  weeklyAllowanceBase: number
  /** AI 쉬운 설명 */
  aiNote: string
}

export const payMonth = { year: 2026, month: 11 }

export const storePayrolls: Record<string, StorePayroll> = {
  dalbit: {
    worked: [2, 4, 6, 9, 11, 13, 16, 18, 20],
    planned: [23, 25, 27, 30],
    hours: 57,
    weeklyAllowanceBase: 92880,
    aiNote: '11/2 주는 15시간 미만이라 주휴수당이 빠져요. 나머지 3주는 주당 30,960원이에요.',
  },
  afternoon: {
    worked: [1, 7, 8, 14, 15, 21],
    planned: [22, 28, 29],
    hours: 30,
    weeklyAllowanceBase: 0,
    aiNote: '매주 15시간 미만이라 주휴수당은 없어요.',
  },
}

export const initialPaySettings: Record<string, PaySettings> = {
  dalbit: { wage: MIN_WAGE, payday: 10, tax: '3.3', weeklyAllowance: true },
  afternoon: { wage: MIN_WAGE, payday: 10, tax: '3.3', weeklyAllowance: true },
}

const TAX_RATE: Record<TaxType, number> = { none: 0, '3.3': 0.033, ins: 0.094 }

export const TAX_LABEL: Record<TaxType, string> = {
  none: '공제 없음',
  '3.3': '3.3% 공제',
  ins: '4대보험 공제',
}

const round10 = (n: number) => Math.round(n / 10) * 10

export interface PayResult {
  hours: number
  base: number
  weeklyAllowance: number
  gross: number
  deduction: number
  net: number
}

export function calcPay(payroll: StorePayroll, settings: PaySettings): PayResult {
  const base = payroll.hours * settings.wage
  const weeklyAllowance = settings.weeklyAllowance
    ? round10((payroll.weeklyAllowanceBase * settings.wage) / MIN_WAGE)
    : 0
  const gross = base + weeklyAllowance
  const deduction = round10(gross * TAX_RATE[settings.tax])
  return { hours: payroll.hours, base, weeklyAllowance, gross, deduction, net: gross - deduction }
}

export function sumPay(results: PayResult[]): PayResult {
  return results.reduce(
    (sum, r) => ({
      hours: sum.hours + r.hours,
      base: sum.base + r.base,
      weeklyAllowance: sum.weeklyAllowance + r.weeklyAllowance,
      gross: sum.gross + r.gross,
      deduction: sum.deduction + r.deduction,
      net: sum.net + r.net,
    }),
    { hours: 0, base: 0, weeklyAllowance: 0, gross: 0, deduction: 0, net: 0 },
  )
}
