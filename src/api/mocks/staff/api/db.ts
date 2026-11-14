/*
 * 가짜 서버의 바뀌는 데이터 — BE 연결 전까지 사용.
 * 서버가 기억해야 하는 값(사장님 답변으로 추가된 매뉴얼 등)을 메모리에 둔다. 새로고침하면 처음으로 돌아간다.
 */

const state = {
  /** 우산 시연: 사장님 답변이 매뉴얼에 추가됐는지 (달빛 카페) */
  umbrellaAdded: false,
}

export function isUmbrellaAdded() {
  return state.umbrellaAdded
}

export function addUmbrellaManual() {
  state.umbrellaAdded = true
}
