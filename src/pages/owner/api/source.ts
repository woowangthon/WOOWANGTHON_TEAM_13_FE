import { env } from '@/lib/env'

/*
 * 사장님 화면 진짜 API / 가짜 서버 스위치 — 담당: 나현
 * 알바 화면과 같은 .env VITE_REAL_API 를 쓴다 (lib/api/source 의 isRealApi 와 같은 규칙).
 * 사장님 화면에만 있는 기능 이름은 여기 둔다. 알바와 같이 쓰는 이름(invitations · recipes · manuals …)은 lib/api/source 의 isRealApi 를 쓴다.
 *   VITE_REAL_API=stores,invitations   → 매장 · 초대코드 만들기를 진짜 API 로
 * 초대코드를 진짜로 만들려면 stores 도 켜야 한다 (진짜 매장 ID 가 필요해서).
 */

export const OWNER_API_FEATURES = ['stores'] as const

export type OwnerApiFeature = (typeof OWNER_API_FEATURES)[number]

/** 이 사장님 기능을 진짜 API 로 부르는지 */
export function isOwnerRealApi(feature: OwnerApiFeature) {
  return env.realApi.has('all') || env.realApi.has(feature)
}
