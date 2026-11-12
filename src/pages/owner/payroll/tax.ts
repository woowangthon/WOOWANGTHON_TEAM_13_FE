// 급여 공제 종류 (BE memberships.tax_type) — 직원 상세에서 정하고 급여에 공제 · 실수령으로 보인다
//   none: 공제 없음 · 3.3: 사업소득 3.3% (소득세 3% + 지방소득세 0.3%) · ins: 4대보험 근로자 부담분
// 4대보험 2026 근로자 부담: 국민연금 4.75% · 건강 3.595% · 장기요양 0.4724% · 고용 0.9% = 9.7174% (BE 와 같은 값, 근로소득세 제외)

export type TaxType = 'none' | '3.3' | 'ins'

export const TAX_OPTIONS: { value: TaxType; label: string; hint: string }[] = [
  {
    value: 'ins',
    label: '4대보험',
    hint: '국민연금 · 건강 · 장기요양 · 고용보험 근로자 부담분 9.7%',
  },
  { value: '3.3', label: '3.3%', hint: '사업소득으로 소득세 3% + 지방소득세 0.3%' },
  { value: 'none', label: '공제 없음', hint: '떼는 금액 없이 그대로 지급해요' },
]

export const TAX_LABEL: Record<TaxType, string> = {
  ins: '4대보험',
  '3.3': '3.3%',
  none: '공제 없음',
}

/** 가짜 서버 계산용 (진짜는 BE 가 계산한 deduction 을 쓴다) */
export const TAX_RATE: Record<TaxType, number> = {
  none: 0,
  '3.3': 0.033,
  ins: 0.097174,
}
