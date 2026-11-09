import { onlineManager } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/ui/utils'

/*
 * 인터넷 연결 안내 — 담당: 민지
 * 끊기면 맨 위에 얇은 띠 "인터넷 연결이 끊겼어요". 다시 연결되면 잠깐 "다시 연결됐어요"를 보여 주고 사라진다.
 * 연결 상태는 TanStack Query 의 onlineManager 를 그대로 써서, 다시 연결되면 Query 가 알아서 다시 불러온다 (refetchOnReconnect).
 * 띠가 보이는 동안 높이를 CSS 변수 --offline-banner 로 알려서, 알바 화면 틀 · 고정 상단이 그만큼 내려가 가려지지 않는다.
 */
const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange)
const isOnline = () => onlineManager.isOnline()

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true)
  const [backOnline, setBackOnline] = useState(false)
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      return
    }
    if (!wasOffline.current) return
    wasOffline.current = false
    setBackOnline(true)
    const timer = setTimeout(() => setBackOnline(false), 2000)
    return () => clearTimeout(timer)
  }, [online])

  const visible = !online || backOnline
  const bar = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = document.documentElement.style
    if (visible && bar.current)
      root.setProperty('--offline-banner', `${bar.current.offsetHeight}px`)
    else root.removeProperty('--offline-banner')
    return () => {
      root.removeProperty('--offline-banner')
    }
  }, [visible])

  if (!visible) return null
  return (
    <div
      ref={bar}
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 top-0 z-[70] flex justify-center pt-[env(safe-area-inset-top)] text-center text-[13px] font-semibold text-white animate-in duration-200 slide-in-from-top-2 motion-reduce:animate-none',
        online ? 'bg-brand' : 'bg-ink',
      )}
    >
      <span className="px-4 py-1.5">
        {online ? '다시 연결됐어요' : '인터넷 연결이 끊겼어요 · 연결되면 다시 불러올게요'}
      </span>
    </div>
  )
}
