import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from '@/ui/IconButton'

// 하위 화면 상단 (뒤로 + 제목) — 담당: 나현
interface HeaderProps {
  title?: string
  onBack: () => void
  right?: ReactNode
}

export function Header({ title, onBack, right }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-0.5 py-1">
      <IconButton aria-label="뒤로" onClick={onBack}>
        <ArrowLeft />
      </IconButton>
      {title && <h1 className="m-0 flex-1 text-[17px] font-extrabold">{title}</h1>}
      {right && <div className="ml-auto">{right}</div>}
    </header>
  )
}
