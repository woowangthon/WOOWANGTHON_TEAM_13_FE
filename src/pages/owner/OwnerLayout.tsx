import { Bell, CalendarDays, House, Plus, Store, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { useNotifications, useOwnerQuestions } from '@/pages/owner/api/home'
import { useOwnerProfile } from '@/pages/owner/api/stores'
import { AddMenuSheet } from '@/pages/owner/components/AddMenuSheet'
import { OwnerFrame } from '@/pages/owner/components/OwnerFrame'
import { StoreMenu } from '@/pages/owner/components/StoreMenu'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { LoadError } from '@/shared/LoadError'
import { BottomNav, type BottomNavItem } from '@/ui/BottomNav'
import { Spinner } from '@/ui/Spinner'
import { Toaster } from '@/ui/Toast'

// 사장 화면 공통 틀 — 담당: 나현 (디자인: 사장님 v3)
// 상단: 매장 고르기 · 알림 · 마이페이지 / 하단 탭: 홈 · 매장 정보 · + 추가 · 직원 · 근무
// 데스크톱(lg): 하단 탭 대신 왼쪽 메뉴 (OwnerFrame → OwnerSidebar), 위 줄은 그대로

export default function OwnerLayout() {
  const { store, stores, setCurrentStoreId, isPending, error, retry } = useOwnerStore()
  const profile = useOwnerProfile()
  const questions = useOwnerQuestions(store.storeId)
  const notifications = useNotifications()
  const [adding, setAdding] = useState(false)
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  // 푸시 알림 링크(?store=)로 들어오면 그 매장으로 한 번 바꾸고 주소에서 store 를 지운다
  // (남겨 두면 매장 메뉴로 다른 매장을 골라도 이 값으로 다시 돌아감)
  const linkedStoreId = params.get('store')
  useEffect(() => {
    if (!linkedStoreId || isPending) return
    if (stores.some((item) => item.storeId === linkedStoreId)) setCurrentStoreId(linkedStoreId)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('store')
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }, [linkedStoreId, isPending, setCurrentStoreId, setParams, stores])

  const hasQuestion = (questions.data?.questions.length ?? 0) > 0
  // 종 점: 처리할 질문 · 대타가 있거나 안 읽은 인수인계가 있을 때 (읽은 인수인계는 14일 동안 목록에만)
  const hasNotification = (notifications.data?.notifications ?? []).some(
    (n) => n.kind !== 'handover' || !n.isRead,
  )
  const initial = (profile.data?.name ?? '사장님').slice(0, 1)

  const navItems: BottomNavItem[] = [
    {
      to: '/owner',
      label: '홈',
      icon: House,
      end: true,
      alsoActive: ['/owner/handover'],
      badge: hasQuestion,
    },
    { to: '/owner/recipes', label: '매장 정보', icon: Store, alsoActive: ['/owner/manuals'] },
    { to: '/owner/members', label: '직원', icon: Users },
    {
      to: '/owner/schedule',
      label: '근무',
      icon: CalendarDays,
      alsoActive: ['/owner/payroll', '/owner/staffing'],
    },
  ]

  // 매장이 하나도 없으면 매장 등록부터
  if (!isPending && !error && stores.length === 0) return <Navigate to="/owner/store/new" replace />

  return (
    <OwnerFrame colors={store}>
      {/* 위 줄: 왼쪽 매장 바꾸기 · 가운데 로고 · 오른쪽 알림 + 프로필 — 좌우 칸 너비를 같게(92px) 해서 로고(124px)가 가운데 · 버튼 36px
          데스크톱은 로고가 왼쪽 메뉴에 있어서 가운데 로고를 빼고 매장 이름도 다 보인다 */}
      <header className="grid grid-cols-[92px_1fr_92px] items-center gap-2 px-0.5 py-1 lg:flex lg:justify-between">
        {stores.length > 0 ? (
          <StoreMenu
            compact
            store={store}
            stores={stores}
            onSelect={(next) => {
              setCurrentStoreId(next.storeId)
              window.scrollTo(0, 0)
            }}
          />
        ) : (
          <span />
        )}
        <img
          src="/logo-crewbean.png"
          alt="crewBean"
          className="w-[124px] justify-self-center lg:hidden"
        />
        <div className="flex items-center justify-end gap-1.5 lg:gap-2">
          {/* 알림은 전체 화면 (알바 알림과 같은 모양) */}
          <Link
            to="/owner/notifications"
            aria-label={hasNotification ? '알림, 새 알림 있음' : '알림'}
            // IconButton(card · md)과 같은 모양 — 주소로 가서 Link
            className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-foreground lg:size-[42px] transition-transform duration-100 active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <Bell className="size-[19px] lg:size-[22px]" />
            {hasNotification && (
              <span className="absolute top-2 right-[9px] size-2 rounded-full border-2 border-card bg-destructive lg:top-2.5 lg:right-[11px]" />
            )}
          </Link>
          <Link
            to="/owner/me"
            aria-label="마이페이지"
            className="flex size-9 items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-background lg:size-[42px] lg:text-base"
          >
            {initial}
          </Link>
        </div>
      </header>

      {isPending ? <Spinner /> : error ? <LoadError error={error} onRetry={retry} /> : <Outlet />}

      {/* 데스크톱은 왼쪽 메뉴(OwnerSidebar)가 대신한다 */}
      <div className="lg:hidden">
        <BottomNav
          items={navItems}
          pathname={pathname}
          fab={{ label: '추가', icon: Plus, onClick: () => setAdding(true) }}
        />
      </div>
      <Toaster />

      <AddMenuSheet open={adding} onClose={() => setAdding(false)} />
    </OwnerFrame>
  )
}
