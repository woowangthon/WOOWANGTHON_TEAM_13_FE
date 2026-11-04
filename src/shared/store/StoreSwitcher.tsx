import type { StoreTheme } from '@/lib/api/types'
import { STORE_ICON } from '@/shared/icons'
import { StoreAvatar } from '@/shared/store/StoreAvatar'
import { BottomSheet } from '@/ui/BottomSheet'

// 공용 보기 부품: 상단 매장 전환 (n잡) · 사장/알바 화면이 함께 사용 — 담당: 민지
// 매장 목록 시트. 여는 버튼(상단 매장 이름)은 화면 틀이 그린다
/** 목록에 보이는 매장 (알바: useCurrentStore 의 stores) */
export interface StoreSwitcherItem {
  id: string
  name: string
  /** 한 줄 설명 (예: 주 3회 마감 · 박 사장님) */
  meta: string
  color: string
  /** 테마 키 → 아이콘 */
  icon: StoreTheme
}

interface StoreSwitcherProps<T extends StoreSwitcherItem> {
  open: boolean
  onClose: () => void
  stores: T[]
  currentId: string
  onSelect: (store: T) => void
}

export function StoreSwitcher<T extends StoreSwitcherItem>({
  open,
  onClose,
  stores,
  currentId,
  onSelect,
}: StoreSwitcherProps<T>) {
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
