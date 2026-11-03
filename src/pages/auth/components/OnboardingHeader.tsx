import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { IconButton } from '@/ui/IconButton'
import { cn } from '@/ui/utils'

// 역할 선택 · 초대코드 입력 상단: 뒤로 + 진행 점 + 로그인 방식 표시

/** 로그인 방식 표시 (카카오 · 구글 브랜드 색) */
const PROVIDER_MARK: Record<string, { label: string; mark: string; bg: string; fg: string }> = {
  kakao: { label: '카카오', mark: 'K', bg: '#FEE500', fg: '#000000' },
  google: { label: 'Google', mark: 'G', bg: '#E8EEF9', fg: '#4285F4' },
}

const STEPS = 2 // 역할 선택 → 매장 등록 · 초대코드 입력

/** step: 0 역할 선택 · 1 매장 등록 · 초대코드 입력 */
export function OnboardingHeader({ step, onBack }: { step: 0 | 1; onBack: () => void }) {
  const provider = useAuthStore((state) => state.provider)
  const mark = provider ? PROVIDER_MARK[provider] : undefined

  return (
    <header className="flex items-center justify-between gap-2.5 px-0.5 py-1">
      <IconButton aria-label="뒤로" onClick={onBack}>
        <ArrowLeft />
      </IconButton>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-250',
              i === step ? 'w-[22px]' : 'w-1.5',
              i <= step ? 'bg-brand' : 'bg-line',
            )}
          />
        ))}
      </div>
      {mark ? (
        <span className="flex items-center gap-1.5 rounded-full bg-card py-[7px] pr-[11px] pl-2 text-xs font-semibold text-muted-foreground">
          <span
            className="flex size-4 items-center justify-center rounded-full text-[9px] font-black"
            style={{ background: mark.bg, color: mark.fg }}
          >
            {mark.mark}
          </span>
          {mark.label}
        </span>
      ) : (
        <span className="w-[42px]" />
      )}
    </header>
  )
}
