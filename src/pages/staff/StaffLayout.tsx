import { CalendarDays, ChevronDown, Coffee, House, MessagesSquare, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { STORE_ICON } from '@/shared/icons'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { StoreAvatar, StoreSheet } from '@/pages/staff/components/StoreSheet'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { BottomNav, type BottomNavItem } from '@/ui/BottomNav'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'

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
  const { store, stores, setCurrentStoreId } = useCurrentStore()
  const profileName = useStaffStore((state) => state.profileName)
  const [storeSheetOpen, setStoreSheetOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const StoreIcon = STORE_ICON[store.icon]

  return (
    <StaffFrame store={store}>
      <header className="flex items-center justify-between gap-2.5 px-0.5 py-1">
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
        <Link
          to="/staff/me"
          aria-label="마이페이지"
          className="flex size-[42px] items-center justify-center rounded-full bg-brand text-base font-extrabold text-background"
        >
          {profileName.slice(0, 1)}
        </Link>
      </header>

      <Outlet />

      <BottomNav
        items={NAV_ITEMS}
        pathname={pathname}
        fab={{ label: '인수인계 남기기', icon: Plus, onClick: () => navigate('/staff/handover') }}
      />
      <Toaster />

      <StoreSheet
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
