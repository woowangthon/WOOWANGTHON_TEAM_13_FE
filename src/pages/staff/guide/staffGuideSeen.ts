// 알바 앱 사용법(/staff/guide)을 봤는지 — 알바 홈에 처음 들어오면 한 번 보여 준다. [건너뛰기]도 본 것으로
const KEY = 'crewbean-guide-staff-v1'

/** 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서도 같은 접속 안에서는 다시 안 뜨게 */
let seenInMemory = false

export function hasSeenStaffGuide() {
  if (seenInMemory) return true
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markStaffGuideSeen() {
  seenInMemory = true
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // 저장 실패해도 화면은 그대로 (이번 접속 동안은 seenInMemory)
  }
}
