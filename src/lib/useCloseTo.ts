import { useLocation, useNavigate } from 'react-router'

/**
 * 시트 · 하위 화면 닫기: 앱 안에서 왔으면 뒤로, 주소로 바로 들어왔으면 fallback 으로 간다.
 */
export function useCloseTo(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
