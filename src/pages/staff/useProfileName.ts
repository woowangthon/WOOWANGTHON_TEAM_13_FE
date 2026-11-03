import { useAuthStore } from '@/lib/authStore'
import { useStaffStore } from '@/pages/staff/staffStore'

/**
 * 알바 화면에 보이는 내 이름 (상단 동그라미 · 마이페이지).
 * 로그인했으면 GET /me 의 nickname, VITE_SKIP_AUTH 로 me 가 없으면 가짜 이름(지은).
 * 이름 바꾸기는 아직 화면 안에서만 바뀐다 (BE 연결 시 PATCH /users/me).
 */
export function useProfileName() {
  const me = useAuthStore((state) => state.me)
  const setMe = useAuthStore((state) => state.setMe)
  const mockName = useStaffStore((state) => state.profileName)
  const setMockName = useStaffStore((state) => state.setProfileName)

  if (!me) return [mockName, setMockName] as const

  const setName = (nickname: string) => setMe({ ...me, nickname })
  return [me.nickname, setName] as const
}
