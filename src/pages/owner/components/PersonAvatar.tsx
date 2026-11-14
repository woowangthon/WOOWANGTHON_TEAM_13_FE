import { avatarColors } from '@/pages/owner/components/avatarColors'
import { cn } from '@/ui/utils'

// 직원 이름 첫 글자 동그라미 (사장님은 매장 색)

interface PersonAvatarProps {
  name: string
  /** 직원 순서 (색). owner 면 매장 색 */
  index?: number
  owner?: boolean
  size?: number
  /** 왼쪽 아래 상태 점 색 */
  dot?: string
  className?: string
}

export function PersonAvatar({
  name,
  index = 0,
  owner,
  size = 44,
  dot,
  className,
}: PersonAvatarProps) {
  const [bg, fg] = avatarColors(index)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full font-extrabold',
        owner && 'bg-brand text-background',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        ...(owner ? {} : { background: bg, color: fg }),
      }}
    >
      {name.slice(0, 1)}
      {dot && (
        <span
          className="absolute -bottom-px -left-px size-[13px] rounded-full border-[2.5px] border-card"
          style={{ background: dot }}
        />
      )}
    </span>
  )
}
