// 가짜 데이터: 예상 급여 — BE 연결 전까지 사용. 근무는 가짜 근무표(schedule.ts)에서 내 근무만 골라 계산한다 (api/payroll.ts)

export const MIN_WAGE = 10320

export type TaxType = 'none' | '3.3' | 'ins'

export interface PaySettings {
  /** 시급 (숫자만) */
  wage: number
  /** 급여일 1~31 (그 달에 없는 날이면 말일) */
  payday: number
  tax: TaxType
  /** 주휴수당 자동 계산 */
  weeklyAllowance: boolean
}

/** 사장님이 정한 매장별 급여 설정 (알바는 보기만) */
export const initialPaySettings: Record<string, PaySettings> = {
  dalbit: { wage: MIN_WAGE, payday: 10, tax: '3.3', weeklyAllowance: true },
  afternoon: { wage: MIN_WAGE, payday: 10, tax: '3.3', weeklyAllowance: true },
}

export const TAX_RATE: Record<TaxType, number> = { none: 0, '3.3': 0.033, ins: 0.094 }

export const round10 = (n: number) => Math.round(n / 10) * 10
