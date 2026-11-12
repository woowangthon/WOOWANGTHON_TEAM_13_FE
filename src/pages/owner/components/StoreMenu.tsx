import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { OwnerStoreView } from '@/pages/owner/useOwnerStore'
import { STORE_ICON } from '@/shared/icons'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { cn } from '@/ui/utils'

// 상단 매장 이름 + 내 매장 목록 (드롭다운). 매장이 여러 곳인 사장님용
interface StoreMenuProps {
  store: OwnerStoreView
  stores: OwnerStoreView[]
  onSelect: (store: OwnerStoreView) => void
  /** 위 줄 가운데 로고와 맞추려고 너비를 오른쪽(알림 + 프로필)과 같게 · 긴 이름은 … (데스크톱은 다 보임) */
  compact?: boolean
}

export function StoreMenu({ store, stores, onSelect, compact }: StoreMenuProps) {
  const [open, setOpen] = useState(false)
  const Icon = STORE_ICON[store.icon]

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label={`매장 바꾸기, 지금 ${store.name}`}
        className={cn(
          'flex items-center gap-2 rounded-full bg-card py-1.5 pr-2.5 pl-1.5 text-[15px] font-bold',
          compact &&
            'h-[42px] w-full gap-1 pr-1 pl-1.5 text-xs lg:w-auto lg:gap-2 lg:pr-2.5 lg:pl-1.5 lg:text-[15px]',
        )}
      >
        <span className="shrink-0">
          <StoreAvatar color={store.color} size={compact ? 26 : 30}>
            <Icon className="size-4" fill="currentColor" />
          </StoreAvatar>
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{store.name}</span>
        <ChevronDown
          className={cn('size-5 shrink-0 text-muted-foreground', compact && 'size-4 lg:size-5')}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute top-[50px] left-0 z-[31] flex min-w-[210px] flex-col gap-0.5 rounded-[22px] bg-card p-1.5 shadow-[0_12px_32px_rgba(40,46,36,0.18)] animate-in fade-in-0 zoom-in-95"
          >
            {stores.map((s) => {
              const on = s.storeId === store.storeId
              return (
                <button
                  key={s.storeId}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => {
                    setOpen(false)
                    onSelect(s)
                  }}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left text-[15px] font-bold whitespace-nowrap',
                    on && 'bg-accent',
                  )}
                >
                  {s.name}
                  {on && <Check className="size-[19px] text-brand" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
