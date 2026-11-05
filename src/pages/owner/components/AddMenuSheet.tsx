import { BookOpen, Camera, Coffee, UserPlus, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '@/ui/BottomSheet'
import { cn } from '@/ui/utils'

// 하단 + 버튼: 무엇을 추가할지 고르는 시트
const ITEMS: { to: string; label: string; icon: LucideIcon; primary?: boolean }[] = [
  { to: '/owner/recipes/new', label: '레시피', icon: Coffee, primary: true },
  { to: '/owner/recipes/scan', label: '사진으로 레시피', icon: Camera },
  { to: '/owner/manuals/new', label: '매뉴얼', icon: BookOpen },
  { to: '/owner/members/new', label: '알바생 초대', icon: UserPlus },
]

export function AddMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <BottomSheet open={open} onClose={onClose} label="추가">
      <div className="flex flex-col gap-3.5">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">추가</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {ITEMS.map(({ to, label, icon: Icon, primary }) => (
            <button
              key={to}
              type="button"
              onClick={() => {
                onClose()
                navigate(to)
              }}
              className={cn(
                'flex min-h-[118px] flex-col justify-between gap-3 rounded-[24px] p-4 text-left',
                primary ? 'bg-brand text-white' : 'bg-white text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-10 items-center justify-center rounded-full text-brand',
                  primary ? 'bg-white' : 'bg-brand-soft',
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-[15px] font-extrabold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
