import { isRealApi } from '@/lib/api/source'
import { env } from '@/lib/env'

/*
 * 서버 미리 깨우기 — 담당: 민지
 * BE(Render 무료)는 15분 쉬면 잠들어 첫 요청이 30초~1분 걸린다. 로그인 화면을 열거나 로그인 버튼을 누를 때
 * GET /health/live 를 미리 한 번 보내, 카카오 · 구글 로그인 화면에 다녀오는 동안 서버가 깨어나게 한다.
 * 토큰 없이 · 결과 무시 · 실패해도 아무것도 안 보여 준다. 실서버 모드(VITE_REAL_API 에 users)일 때만.
 */

/** 보낸 지 이 시간 안에는 다시 보내지 않는다 */
const WAKE_INTERVAL_MS = 30_000
let lastWakeAt = 0

export function wakeServer() {
  if (!isRealApi('users')) return
  const now = Date.now()
  if (now - lastWakeAt < WAKE_INTERVAL_MS) return
  lastWakeAt = now
  // apiFetch 를 쓰지 않는다: 토큰 · 에러 처리(토스트 · 로그아웃)가 필요 없다.
  // keepalive: 버튼을 누르자마자 카카오 · 구글 로그인 화면으로 넘어가도 요청이 끊기지 않게
  void fetch(`${env.apiUrl}/health/live`, { cache: 'no-store', keepalive: true }).catch(() => {})
}
