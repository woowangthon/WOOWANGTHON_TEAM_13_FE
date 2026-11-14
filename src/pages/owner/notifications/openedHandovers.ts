// 사장님이 눌러서 본 인수인계 알림 — 알림 목록에서 뺀다 (QA 11/15: 누르면 사라지게).
// BE 는 매장 단위 읽음만 있어서 이 브라우저에 알림 ID 를 남긴다. 너무 쌓이지 않게 최근 200개만
const KEY = 'crewbean-owner-opened-handovers-v1'
const MAX = 200

export function readOpenedHandovers(): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveOpenedHandovers(ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids].slice(-MAX)))
  } catch {
    // 저장 실패해도 이번 화면에서는 빠져 있다
  }
}
