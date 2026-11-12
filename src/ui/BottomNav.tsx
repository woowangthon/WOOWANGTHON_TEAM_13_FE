import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/ui/utils'

// 하단 탭 — 담당: 나현. 아이콘 + 활성 점, 가운데 + 버튼(fab)
// 아이폰 홈 바와 겹치지 않게 바닥에서 max(12px, safe-area) 띄운다 (index.html viewport-fit=cover)
// 11/13 얇게(민지, 나현 공유): 바 높이 약 58px — 바 위아래 4px · 탭 칸은 바 높이를 꽉 채움(터치 50px) · 아이콘 20 · 글자 11 · 가운데 + 44px.
// 바 위에 붙는 것(알바 · 사장님 화면 아래 여백 104px, 채팅 입력칸)은 이 높이에 맞춘다
// 누를 때 회색 네모(탭 하이라이트 · 포커스 테두리)는 없고, 키보드(focus-visible)일 때만 칸 모양 둥근 테두리
export interface BottomNavItem {
  to: string
  label: string
  icon: LucideIcon
  /** 하위 주소에서는 활성으로 보지 않는다 (홈 '/staff' 처럼) */
  end?: boolean
  /** 이 주소들에서도 활성으로 본다 (예: 레시피 탭 ↔ /staff/manuals) */
  alsoActive?: string[]
  /** 탭 아이콘 옆 빨간 점 (새 알림 · 확인 필요) — 그 탭에 있을 때는 숨긴다 */
  badge?: boolean
}

interface BottomNavProps {
  items: BottomNavItem[]
  fab?: { label: string; icon: LucideIcon; onClick: () => void }
  pathname: string
}

export function BottomNav({ items, fab, pathname }: BottomNavProps) {
  const half = Math.ceil(items.length / 2)
  const left = fab ? items.slice(0, half) : items
  const right = fab ? items.slice(half) : []
  const columns = items.length + (fab ? 1 : 0)

  return (
    <nav
      className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-20 grid w-[calc(100%-24px)] max-w-[436px] -translate-x-1/2 items-stretch rounded-[30px] bg-card/95 px-2 py-1 shadow-float backdrop-blur-md"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {left.map((item) => (
        <NavTab key={item.to} item={item} pathname={pathname} />
      ))}
      {fab && (
        <button
          type="button"
          aria-label={fab.label}
          onClick={fab.onClick}
          className="flex size-11 items-center justify-center self-center justify-self-center rounded-full bg-brand text-white shadow-[0_0_0_4px_#E3DDD2,0_8px_18px_rgba(30,40,32,0.25)] outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2"
        >
          <fab.icon className="size-6" strokeWidth={2.2} />
        </button>
      )}
      {right.map((item) => (
        <NavTab key={item.to} item={item} pathname={pathname} />
      ))}
    </nav>
  )
}

function NavTab({ item, pathname }: { item: BottomNavItem; pathname: string }) {
  const extra = item.alsoActive?.some((path) => pathname.startsWith(path)) ?? false
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          'relative flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1 outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-brand/60',
          isActive || extra ? 'text-foreground' : 'text-subtle',
        )
      }
    >
      {({ isActive }) => {
        const active = isActive || extra
        return (
          <>
            <item.icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
            {item.badge && !active && (
              <span
                aria-label="새 알림"
                className="absolute top-1 right-[calc(50%-14px)] size-2 rounded-full border-2 border-card bg-destructive"
              />
            )}
            <span className="text-[11px] leading-[1.3] font-semibold whitespace-nowrap">
              {item.label}
            </span>
            <span className={cn('size-1 rounded-full', active ? 'bg-brand' : 'bg-transparent')} />
          </>
        )
      }}
    </NavLink>
  )
}
