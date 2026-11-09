// 공용: 누를 때 반응 (카드 · 목록 줄) — 담당: 민지
// 0.15초 동안 살짝(98%) 작아지고, 그림자가 있는 카드는 그림자도 조금 줄인다. 움직임 줄이기 설정이면 크기는 그대로
export const PRESSABLE =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100'

/** 그림자(shadow-soft) 있는 카드: 눌릴 때 그림자도 살짝 줄인다 */
export const PRESSABLE_CARD = `${PRESSABLE} active:shadow-[0_3px_10px_rgba(40,46,36,0.05)]`

/** 눌러지지 않는(disabled) 상태일 수도 있는 버튼 */
export const PRESSABLE_CARD_ENABLED =
  'transition-[transform,box-shadow,opacity] duration-150 ease-out enabled:active:scale-[0.98] enabled:active:shadow-[0_3px_10px_rgba(40,46,36,0.05)] motion-reduce:transition-none motion-reduce:enabled:active:scale-100'
