import type { ReactNode } from 'react'
import type { StaffStore } from '@/api/mocks/staff/stores'
import { STORE_ICON } from '@/shared/icons'
import { BottomSheet } from '@/ui/BottomSheet'

// 매장 전환 시트 (n잡)
interface StoreSheetProps {
  open: boolean
  onClose: () => void
  stores: StaffStore[]
  currentId: string
  onSelect: (store: StaffStore) => void
}

export function StoreSheet({ open, onClose, stores, currentId, onSelect }: StoreSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} label="일하는 매장">
      <div className="flex flex-col gap-2.5">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">일하는 매장</h2>
        {stores.map((store) => {
          const Icon = STORE_ICON[store.icon]
          const current = store.id === currentId
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => onSelect(store)}
              style={{ borderColor: current ? store.color : '#ECEAE3' }}
              className="flex items-center gap-3 rounded-[22px] border-[1.5px] bg-white px-4 py-3.5 text-left"
            >
              <StoreAvatar color={store.color}>
                <Icon className="size-5" fill="currentColor" />
              </StoreAvatar>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[17px] font-bold">{store.name}</span>
                <span className="text-[13px] text-muted-foreground">{store.meta}</span>
              </span>
              {current && (
                <span className="text-xs font-bold" style={{ color: store.color }}>
                  지금 매장
                </span>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

export function StoreAvatar({
  color,
  children,
  size = 42,
}: {
  color: string
  children: ReactNode
  size?: number
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-background"
      style={{ background: color, width: size, height: size }}
    >
      {children}
    </span>
  )
}
