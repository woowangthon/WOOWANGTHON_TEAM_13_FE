import { Bell, CalendarDays, ChevronDown, Coffee, House, MessagesSquare, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import logo from '@/assets/logo-crewbean.webp'
import { useNotifications } from '@/lib/api/notifications'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { useProfileName } from '@/pages/staff/useProfileName'
import { LoadError } from '@/shared/LoadError'
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
import { StoreSwitcher } from '@/shared/store/StoreSwitcher'
import { BottomNav, type BottomNavItem } from '@/ui/BottomNav'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 알바 화면 공통 틀 (상단: 왼쪽 매장 전환 · 가운데 crewBean 로고 · 오른쪽 알림 · 프로필 / 하단 탭: 홈 · 레시피 · + 인수인계 · AI 사수 · 근무)
// 로고는 누르면 알바 홈, 이미 홈이면 맨 위로 (앱 로고를 누르면 처음으로 가는 흔한 동작)

const NAV_ITEMS: BottomNavItem[] = [
  { to: '/staff', label: '홈', icon: House, end: true, alsoActive: ['/staff/handover'] },
  { to: '/staff/recipes', label: '레시피', icon: Coffee, alsoActive: ['/staff/manuals'] },
  { to: '/staff/chat', label: 'AI 사수', icon: MessagesSquare },
  {
    to: '/staff/schedule',
    label: '근무',
    icon: CalendarDays,
    alsoActive: ['/staff/payroll', '/staff/availability'],
  },
]

export default function StaffLayout() {
  const { store, stores, setCurrentStoreId, isPending, error, retry } = useCurrentStore()
  const [profileName] = useProfileName()
  const [storeSheetOpen, setStoreSheetOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // 안 읽은 알림 수 (1분마다 · 화면에 돌아올 때 다시 부름)
  const unread = useNotifications(store.id).data?.unreadCount ?? 0
  // 조금이라도 스크롤하면 상단에 반투명 흐림 배경 (내용이 그 아래로 지나가게)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <StaffFrame store={store}>
      <header
        className={cn(
          'sticky top-(--offline-banner,0px) z-20 -mx-4 -mt-3.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4.5 pt-[max(14px,env(safe-area-inset-top))] pb-2 transition-[background-color,box-shadow,backdrop-filter] duration-200',
          scrolled &&
            'bg-white/80 shadow-[0_1px_0_rgba(40,46,36,0.06)] backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-white',
        )}
      >
        <button
          type="button"
          onClick={() => setStoreSheetOpen(true)}
          aria-label={`매장 바꾸기 · 지금 ${store.name}`}
          // 왼쪽 칸 폭(375px 에서 124px) 안에서만: 이름 + ▾ 만 (꾸밈 아이콘 원 없이), 길면 "달빛…"처럼 말줄임.
          // 흰 바탕 위 크림색 알약이라 옅은 테두리로 구분 (docs/08 4)
          className="flex h-10 max-w-full min-w-0 items-center gap-0.5 justify-self-start rounded-full border border-line/60 bg-card pr-2.5 pl-3.5 text-[15px] font-bold"
        >
          <span className="min-w-0 truncate">{store.name}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
        <Link
          to="/staff"
          aria-label="crewBean 홈"
          onClick={(event) => {
            if (pathname !== '/staff') return
            event.preventDefault()
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
          }}
          className="flex h-10 items-center justify-self-center"
        >
          <img src={logo} alt="crewBean" width={451} height={144} className="h-6 w-auto" />
        </Link>
        <span className="flex items-center gap-2 justify-self-end">
          <Link
            to="/staff/notifications"
            aria-label={unread > 0 ? `알림 · 안 읽은 알림 ${unread}개` : '알림'}
            className="relative flex size-[42px] items-center justify-center rounded-full bg-card text-foreground"
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white tabular-nums">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <Link
            to="/staff/me"
            aria-label="마이페이지"
            className="flex size-[42px] items-center justify-center rounded-full bg-brand text-base font-extrabold text-background"
          >
            {profileName.slice(0, 1)}
          </Link>
        </span>
      </header>

      {/* 매장 정보를 받기 전에는 화면 대신 뼈대 (매장 색 · 데이터가 섞여 보이지 않게) */}
      {isPending ? (
        <SkeletonGroup label="내 매장을 불러오는 중" className="flex flex-col gap-4">
          <Skeleton shape="line" className="mx-1 h-6 w-32" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </SkeletonGroup>
      ) : error ? (
        <LoadError what="내 매장을" error={error} onRetry={retry} />
      ) : (
        <Outlet />
      )}

      <BottomNav
        items={NAV_ITEMS}
        pathname={pathname}
        fab={{
          label: '인수인계 남기기',
          icon: Plus,
          // 홈에서 누르면 홈 위에 시트가 뜨니 홈 스크롤 자리 유지, 다른 탭에서는 홈 맨 위로
          onClick: () => navigate('/staff/handover', { preventScrollReset: pathname === '/staff' }),
        }}
      />
      <Toaster />

      <StoreSwitcher
        open={storeSheetOpen}
        onClose={() => setStoreSheetOpen(false)}
        stores={stores}
        currentId={store.id}
        onSelect={(next) => {
          setCurrentStoreId(next.id)
          setStoreSheetOpen(false)
          toast(`${next.name} 매장으로 바꿨어요`)
        }}
      />
    </StaffFrame>
  )
}
