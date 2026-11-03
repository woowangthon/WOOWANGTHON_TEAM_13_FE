import { cn } from '@/ui/utils'

// 켜기/끄기 — 담당: 나현
interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-8 w-14 shrink-0 rounded-full transition-colors',
        checked ? 'bg-brand' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-[left]',
          checked ? 'left-[27px]' : 'left-[3px]',
        )}
      />
    </button>
  )
}
