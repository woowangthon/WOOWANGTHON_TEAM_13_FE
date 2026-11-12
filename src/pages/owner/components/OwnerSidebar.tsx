import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  House,
  Plus,
  Store,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useOwnerQuestions } from '@/pages/owner/api/home'
import { AddMenuSheet } from '@/pages/owner/components/AddMenuSheet'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { cn } from '@/ui/utils'

// 데스크톱(lg 1024px 이상) 왼쪽 메뉴 — 하단 탭 대신. 휴대폰 · 태블릿에서는 안 보인다 (OwnerFrame 이 넣는다)
// 하단 탭(홈 · 매장 정보 · ＋ · 직원 · 근무)에 급여 · 인수인계를 따로 꺼내고, 아래에 마이페이지 · 앱 사용법

interface SideItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  alsoActive?: string[]
  badge?: boolean
}

export function OwnerSidebar() {
  const { store } = useOwnerStore()
  const questions = useOwnerQuestions(store.storeId)
  const { pathname } = useLocation()
  const [adding, setAdding] = useState(false)

  const main: SideItem[] = [
    {
      to: '/owner',
      label: '홈',
      icon: House,
      end: true,
      badge: (questions.data?.questions.length ?? 0) > 0,
    },
    { to: '/owner/recipes', label: '매장 정보', icon: Store, alsoActive: ['/owner/manuals'] },
    { to: '/owner/members', label: '직원', icon: Users },
    { to: '/owner/schedule', label: '근무', icon: CalendarDays, alsoActive: ['/owner/staffing'] },
    { to: '/owner/payroll', label: '급여', icon: Wallet },
    { to: '/owner/handover', label: '인수인계', icon: ClipboardList },
  ]
  const sub: SideItem[] = [
    { to: '/owner/me', label: '마이페이지', icon: UserRound },
    { to: '/owner/guide', label: '앱 사용법', icon: BookOpen },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[256px] flex-col gap-7 border-r border-line/60 bg-card px-5 pt-7 pb-6 lg:flex">
      <div className="flex flex-col items-start gap-1.5 px-2">
        <img src="/logo-crewbean.png" alt="crewBean" className="h-8 w-auto" />
        <span className="text-[11px] text-muted-foreground">우리 매장 AI 사수</span>
      </div>

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand text-[15px] font-extrabold text-white transition-transform active:scale-[0.98]"
      >
        <Plus className="size-5" strokeWidth={2.4} />
        추가
      </button>

      <nav aria-label="사장님 메뉴" className="flex flex-col gap-1">
        {main.map((item) => (
          <SideLink key={item.to} item={item} pathname={pathname} />
        ))}
      </nav>

      <nav aria-label="계정" className="mt-auto flex flex-col gap-1">
        {sub.map((item) => (
          <SideLink
            key={item.to}
            item={item}
            pathname={pathname}
            // 앱 사용법은 다 보면 지금 화면으로 돌아온다
            state={item.to === '/owner/guide' ? { returnTo: pathname } : undefined}
          />
        ))}
      </nav>

      <AddMenuSheet open={adding} onClose={() => setAdding(false)} />
    </aside>
  )
}

function SideLink({
  item,
  pathname,
  state,
}: {
  item: SideItem
  pathname: string
  state?: unknown
}) {
  const extra = item.alsoActive?.some((path) => pathname.startsWith(path)) ?? false
  return (
    <NavLink
      to={item.to}
      end={item.end}
      state={state}
      className={({ isActive }) =>
        cn(
          'relative flex h-11 items-center gap-3 rounded-[14px] px-3.5 text-[15px] transition-colors',
          isActive || extra
            ? 'bg-brand-soft font-extrabold text-brand'
            : 'font-semibold text-muted-foreground hover:bg-background hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className="size-5" strokeWidth={isActive || extra ? 2.4 : 1.9} />
          {item.label}
          {item.badge && !isActive && (
            <span aria-label="새 알림" className="ml-auto size-2 rounded-full bg-destructive" />
          )}
        </>
      )}
    </NavLink>
  )
}
