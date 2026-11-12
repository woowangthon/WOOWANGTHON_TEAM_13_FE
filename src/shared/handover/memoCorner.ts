// 공용: 인수인계 메모지 카드의 접힌 오른쪽 위 모서리 — 담당: 민지
// 알바 인수인계 시트(HandoverWriteForm variant="note")와 알바 앱 사용법 그림이 같이 쓴다 (사장님 기본 모양은 안 씀)
//
// 카드(MEMO_CARD): 각진 흰 카드 + 옅은 테두리. clip-path 로 오른쪽 위 28px 를 대각선으로 잘라 낸다 →
//   잘린 바깥 삼각형에는 카드 바탕 · 테두리가 안 그려지고(시트 바탕이 비쳐 보임), 위 · 오른쪽 테두리는 대각선 끝에서 끝난다
// 접힌 면(MEMO_FOLD): 같은 28px 칸을 카드 테두리 바깥 끝(-1px)부터 덮고, 대각선 아래 반만 옅은 회색(muted).
//   대각선(접힌 선)을 따라 카드 테두리와 같은 옅은 선 — 선을 대각선 바깥 1px 부터 그려서 clip-path 가장자리에 흰 틈이 안 생기게 (바깥은 어차피 잘림)

/** 접힌 크기 (28px) — clip-path 와 접힌 면이 같은 값을 써야 대각선이 맞는다 */
export const MEMO_CARD =
  'relative flex flex-col overflow-hidden border border-line/60 bg-white [clip-path:polygon(0_0,calc(100%-28px)_0,100%_28px,100%_100%,0_100%)]'

export const MEMO_FOLD =
  'pointer-events-none absolute -top-px -right-px size-7 bg-[linear-gradient(to_bottom_left,transparent_calc(50%-1px),color-mix(in_oklab,var(--line)_60%,white)_calc(50%-1px),color-mix(in_oklab,var(--line)_60%,white)_calc(50%+1px),var(--muted)_calc(50%+1px))]'
