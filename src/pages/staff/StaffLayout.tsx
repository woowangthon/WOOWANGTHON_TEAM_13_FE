import { Bell, CalendarDays, ChevronDown, Coffee, House, MessagesSquare, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useNotifications } from '@/lib/api/notifications'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { useProfileName } from '@/pages/staff/useProfileName'
import { LoadError } from '@/shared/LoadError'
import { STORE_ICON } from '@/shared/icons'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { StoreSwitcher } from '@/shared/store/StoreSwitcher'
import { BottomNav, type BottomNavItem } from '@/ui/BottomNav'
import { Spinner } from '@/ui/Spinner'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 알바 화면 공통 틀 (상단 매장 전환 · 하단 탭: 홈 · 레시피 · + 인수인계 · AI 사수 · 근무)

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
  const StoreIcon = STORE_ICON[store.icon]
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
          'sticky top-(--offline-banner,0px) z-20 -mx-4 -mt-3.5 flex items-center justify-between gap-2.5 px-4.5 pt-[max(14px,env(safe-area-inset-top))] pb-2 transition-[background-color,box-shadow,backdrop-filter] duration-200',
          scrolled &&
            'bg-white/80 shadow-[0_1px_0_rgba(40,46,36,0.06)] backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-white',
        )}
      >
        <button
          type="button"
          onClick={() => setStoreSheetOpen(true)}
          className="flex items-center gap-2 rounded-full bg-card py-1.5 pr-3.5 pl-1.5 text-[15px] font-bold"
        >
          <StoreAvatar color={store.color} size={30}>
            <StoreIcon className="size-4" fill="currentColor" />
          </StoreAvatar>
          {store.name}
          <ChevronDown className="size-[18px] text-muted-foreground" />
        </button>
        <span className="flex items-center gap-2">
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

      {/* 매장 정보를 받기 전에는 화면 대신 Spinner (매장 색 · 데이터가 섞여 보이지 않게) */}
      {isPending ? (
        <Spinner />
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
