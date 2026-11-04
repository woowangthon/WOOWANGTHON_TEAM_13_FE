import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/ui/utils'

// 하단 탭 — 담당: 나현. 아이콘 + 활성 점, 가운데 + 버튼(fab)
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
      className="fixed bottom-3 left-1/2 z-20 grid w-[calc(100%-24px)] max-w-[436px] -translate-x-1/2 items-center rounded-[30px] bg-card/95 px-2 py-[9px] shadow-float backdrop-blur-md"
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
          className="flex size-[54px] items-center justify-center justify-self-center rounded-full bg-brand text-white shadow-[0_0_0_4px_#E3DDD2,0_8px_18px_rgba(30,40,32,0.25)]"
        >
          <fab.icon className="size-7" strokeWidth={2.2} />
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
          'relative flex flex-col items-center gap-[5px] pt-2 pb-1',
          isActive || extra ? 'text-foreground' : 'text-faint',
        )
      }
    >
      {({ isActive }) => {
        const active = isActive || extra
        return (
          <>
            <item.icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
            {item.badge && !active && (
              <span
                aria-label="새 알림"
                className="absolute top-[5px] right-[calc(50%-16px)] size-2 rounded-full border-2 border-card bg-destructive"
              />
            )}
            <span className="text-[11px] font-semibold whitespace-nowrap">{item.label}</span>
            <span
              className={cn('size-[5px] rounded-full', active ? 'bg-brand' : 'bg-transparent')}
            />
          </>
        )
      }}
    </NavLink>
  )
}
